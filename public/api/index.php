<?php
declare(strict_types=1);
// PHP 8.1+ / PDO MySQL. HTTPS and same-origin requests only in production.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function reply(array $data, int $status=200): never {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
set_exception_handler(function(Throwable $error): never {error_log('EF Verso API: '.$error->getMessage());reply(['error'=>'Não foi possível concluir. Tente novamente.'],500);});
$configFile=__DIR__.'/_private/config.local.php';
if(!is_file($configFile))reply(['configured'=>false,'error'=>'O salvamento online ainda não foi configurado.'],503);
$config=require $configFile;
$secure=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off');
if(!$secure&&!in_array($_SERVER['SERVER_NAME']??'',['localhost','127.0.0.1'],true))reply(['error'=>'Use HTTPS para acessar sua conta.'],400);
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
session_start();
$_SESSION['csrf']??=bin2hex(random_bytes(32));
$method=$_SERVER['REQUEST_METHOD']??'GET';
$action=$_GET['action']??'status';
if($action==='status'&&$method==='GET')reply(['configured'=>true,'signedIn'=>isset($_SESSION['user']),'csrf'=>$_SESSION['csrf'],'username'=>$_SESSION['username']??null]);
if($method!=='POST')reply(['error'=>'Método não permitido.'],405);
if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))reply(['error'=>'Atualize a página e tente novamente.'],403);
$origin=$_SERVER['HTTP_ORIGIN']??'';
if($origin!==''&&rtrim($origin,'/')!==rtrim($config['origin'],'/'))reply(['error'=>'Origem não permitida.'],403);
if((int)($_SERVER['CONTENT_LENGTH']??0)>262144)reply(['error'=>'Dados acima do limite.'],413);
$raw=file_get_contents('php://input',false,null,0,262145);
if(strlen($raw)>262144)reply(['error'=>'Dados acima do limite.'],413);
try{$input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(JsonException $e){reply(['error'=>'Dados inválidos.'],400);}
if(!is_array($input))reply(['error'=>'Dados inválidos.'],400);
if(!in_array($action,['register','login','load','save','logout'],true))reply(['error'=>'Ação desconhecida.'],404);
if(!in_array($action,['register','login'],true)&&!isset($_SESSION['user']))reply(['error'=>'Entre na sua conta para continuar.'],401);
if($action==='logout'){$_SESSION=[];session_destroy();reply(['signedIn'=>false]);}
$db=new PDO('mysql:host='.$config['host'].';dbname='.$config['database'].';charset=utf8mb4',$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
if(in_array($action,['register','login'],true)){
 $username=strtolower(trim((string)($input['username']??'')));$password=(string)($input['password']??'');
 if(!preg_match('/^[a-z0-9_-]{4,32}$/D',$username)||strlen($password)<10||strlen($password)>128)reply(['error'=>'Use um login de 4 a 32 letras/números e senha de 10 a 128 caracteres.'],422);
 $rate=hash('sha256',($_SERVER['REMOTE_ADDR']??'local').'|'.$username);
 $q=$db->prepare('SELECT attempts, touched_at FROM ef_login_limits WHERE bucket=?');$q->execute([$rate]);$lim=$q->fetch(PDO::FETCH_ASSOC);
 if($lim&&strtotime($lim['touched_at'])>time()-900&&(int)$lim['attempts']>=10)reply(['error'=>'Muitas tentativas. Aguarde 15 minutos.'],429);
 $q=$db->prepare('INSERT INTO ef_login_limits(bucket,attempts,touched_at) VALUES (?,1,NOW()) ON DUPLICATE KEY UPDATE attempts=IF(touched_at<DATE_SUB(NOW(),INTERVAL 15 MINUTE),1,attempts+1),touched_at=NOW()');$q->execute([$rate]);
 if($action==='register'){
  $id=bin2hex(random_bytes(16));
  try{$q=$db->prepare('INSERT INTO ef_users(id,username,password_hash) VALUES (?,?,?)');$q->execute([$id,$username,password_hash($password,PASSWORD_DEFAULT)]);}catch(PDOException $e){if($e->getCode()==='23000')reply(['error'=>'Este login já está em uso.'],409);throw $e;}
 }else{
  $q=$db->prepare('SELECT id,password_hash FROM ef_users WHERE username=?');$q->execute([$username]);$user=$q->fetch(PDO::FETCH_ASSOC);
  if(!$user||!password_verify($password,$user['password_hash']))reply(['error'=>'Login ou senha incorretos.'],401);$id=$user['id'];
 }
 $q=$db->prepare('DELETE FROM ef_login_limits WHERE bucket=?');$q->execute([$rate]);
 session_regenerate_id(true);$_SESSION['user']=$id;$_SESSION['username']=$username;$_SESSION['csrf']=bin2hex(random_bytes(32));
 reply(['signedIn'=>true,'username'=>$username,'csrf'=>$_SESSION['csrf']]);
}
if(!isset($_SESSION['user']))reply(['error'=>'Entre na sua conta para continuar.'],401);
if($action==='load'){
 $q=$db->prepare('SELECT state_json,revision FROM ef_saves WHERE user_id=?');$q->execute([$_SESSION['user']]);$row=$q->fetch(PDO::FETCH_ASSOC);
 reply(['state'=>$row?json_decode($row['state_json'],true,64,JSON_THROW_ON_ERROR):null,'revision'=>$row?(int)$row['revision']:0]);
}
if($action==='save'){
 $state=$input['state']??null;$revision=$input['revision']??null;
 if(!is_array($state)||!is_int($revision)||$revision<0||count($state)>64)reply(['error'=>'Formato de progresso inválido.'],422);
 foreach($state as $key=>$value){if(!is_string($key)||!preg_match('/^ef-verso-(?:student|alunos|progress|wallet|theory|controls|mission-[a-z0-9-]+)-v[0-9]+$/D',$key)||!is_string($value)||strlen($value)>65536)reply(['error'=>'Chave de progresso inválida.'],422);try{json_decode($value,true,64,JSON_THROW_ON_ERROR);}catch(JsonException $e){reply(['error'=>'Progresso inválido.'],422);}}
 $json=json_encode($state,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);if(strlen($json)>240000)reply(['error'=>'Progresso acima do limite.'],413);
 $db->beginTransaction();
 // A row exists before locking, so two initial writes cannot both create revision 1.
 $q=$db->prepare('INSERT IGNORE INTO ef_saves(user_id,state_json,revision) VALUES (?,\'{}\',0)');$q->execute([$_SESSION['user']]);
 $q=$db->prepare('SELECT revision FROM ef_saves WHERE user_id=? FOR UPDATE');$q->execute([$_SESSION['user']]);$current=(int)$q->fetchColumn();
 if($current!==$revision){$db->rollBack();reply(['error'=>'Há um salvamento mais recente. Carregue-o antes de salvar novamente.','conflict'=>true],409);}
 $next=$current+1;$q=$db->prepare('UPDATE ef_saves SET state_json=?,revision=?,updated_at=NOW() WHERE user_id=?');$q->execute([$json,$next,$_SESSION['user']]);$db->commit();reply(['saved'=>true,'revision'=>$next]);
}
reply(['error'=>'Ação desconhecida.'],404);
