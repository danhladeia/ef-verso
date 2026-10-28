# Instalação na Hostinger compartilhada (PHP + MySQL)

O jogo roda no navegador. A API PHP armazena contas e cópias do progresso em MySQL; não requer VPS nem um processo Node.js em produção. Não oferece partidas online em tempo real.

## Preparar

Execute `node tools/prepare-hostinger.mjs` na pasta `cidade`. O resultado está em `deployment/hostinger/`: `public_html` contém o site; `schema.sql` contém as tabelas. Esse pacote é destinado à raiz de um domínio ou subdomínio.

## Publicar

1. No hPanel, escolha o domínio/subdomínio do projeto e um site PHP/HTML. Use PHP 8.1 ou superior com PDO MySQL e HTTPS.
2. Crie um banco MySQL e um usuário para ele. Importe `schema.sql` pelo phpMyAdmin, sem apagar tabelas de outro site.
3. Envie o conteúdo de `public_html` para a pasta do site escolhido. Confirme o destino antes de substituir arquivos de um site existente.
4. No servidor, copie `api/_private/config.example.php` para `api/_private/config.local.php`. Preencha domínio completo com HTTPS, servidor MySQL, nome do banco, usuário e senha com os valores exibidos no hPanel. Não envie credenciais por chat nem as inclua no código versionado.
5. Preserve o arquivo `api/_private/.htaccess`. O diretório privado não deve permitir leitura HTTP. O arquivo de configuração também é PHP e não produz saída.
6. Abra o site, selecione **Conta e progresso**, crie um login e use **Salvar na nuvem**. Em outro navegador, entre com o mesmo login e use **Carregar da nuvem**.
7. Teste que uma segunda conta não enxerga o salvamento da primeira. Confirme que `GET /api/index.php?action=status` informa `configured:true` e que requisições sem token CSRF são recusadas.

Guia oficial de publicação: https://www.hostinger.com/support/how-to-upload-a-website-from-backups/
Importação do banco: https://www.hostinger.com/support/1884149-how-to-import-a-database-with-phpmyadmin-in-hostinger/

## Comportamento e limites

- A conta é separada do cadastro local do aluno. Senhas são armazenadas com hash, sessões usam cookies HttpOnly/SameSite e as alterações exigem CSRF.
- O salvamento é manual para permitir escolher qual aparelho contém o progresso desejado. Carregar pede confirmação antes de substituir os dados locais.
- Revisões impedem que dois aparelhos sobrescrevam silenciosamente a mesma versão.
- Moedas e resultados são dados do cliente: esta API guarda progresso, não valida partidas competitivas nem dá privilégios de professor com base no cadastro local.
- Esta primeira instalação não tem recuperação de senha por e-mail. Guarde as credenciais de teste e mantenha backups do banco pelo hPanel.
- A execução com o banco real e a publicação dependem do acesso à conta Hostinger e da definição do domínio. O ambiente local continua funcionando sem API.
