"""Read-only source-PDF audit, with rendered contact sheets and source image manifest."""
import json, re, hashlib
from pathlib import Path
import pymupdf
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'cidade/art-source/theory-image-audit'
OUT.mkdir(parents=True,exist_ok=True)
report={'sourcePages':0,'sourceImageOccurrences':0,'lessons':0,'lessonsWithImages':0,'grades':[]}
for grade in [6,7,8,9]:
    pdf=ROOT/f'Conteudos EDF/Caderno_DED_Express_EF{grade}_leve.pdf'
    doc=pymupdf.open(pdf)
    data=json.loads((ROOT/f'cidade/public/theory/grade-{grade}.json').read_text(encoding='utf-8'))
    lessons=[w for unit in data['units'] for w in unit['weeks']]
    item={'grade':grade,'source':str(pdf.relative_to(ROOT)),'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':[],'weeks':[]}
    sheet=Image.new('RGB',(1400,8*288),'#ece7f1');draw=ImageDraw.Draw(sheet)
    week_pages={}
    for i,page in enumerate(doc):
        text=page.get_text();match=re.search(r'SEMANA\s+(\d{1,2})',text,re.I)
        images=page.get_images(full=True)
        item['pages'].append({'page':i+1,'week':int(match[1]) if match else None,'images':len(images),'uniqueXrefs':sorted({im[0] for im in images})})
        report['sourcePages']+=1;report['sourceImageOccurrences']+=len(images)
        if match:week_pages[int(match[1])]=i+1
        pix=page.get_pixmap(matrix=pymupdf.Matrix(.38,.38),alpha=False)
        thumb=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);thumb.thumbnail((330,260))
        x=(i%4)*350+(350-thumb.width)//2;y=(i//4)*288
        sheet.paste(thumb,(x,y));draw.text(((i%4)*350+8,y+265),f'{grade} ano / pagina {i+1}',fill='#302344')
    sheet.save(OUT/f'grade-{grade}-contact.jpg',quality=88)
    for week in lessons:
        # The active renderer currently has no figure block, and data has no image fields.
        refs=week.get('images',[])
        item['weeks'].append({'week':week['number'],'title':week['title'],'sourcePage':week_pages.get(week['number']),'activeImageReferences':len(refs),'status':'present' if refs else 'not-integrated'})
        report['lessons']+=1;report['lessonsWithImages']+=bool(refs)
    report['grades'].append(item)
(OUT/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Auditoria das imagens dos cadernos nas aulas teóricas','',f"Foram inventariadas {report['sourcePages']} páginas dos quatro cadernos e {report['lessons']} aulas do jogo.",'',
       '## Resultado verificável','',f"As aulas ativas têm {report['lessonsWithImages']} referências de imagem. O componente `src/theory.js` apresenta texto e quiz; não renderiza figuras dos cadernos. Portanto, as imagens dos PDFs ainda não foram integradas às aulas. Não há como aprovar enquadramento, legenda ou correspondência de imagens dentro das aulas enquanto essa integração não existir.",'',
       f"Os PDFs contêm {report['sourceImageOccurrences']} ocorrências de imagens incorporadas, incluindo elementos repetidos de identidade visual. Esse número não representa figuras pedagógicas distintas.",'',
       '## Evidências e próximos ajustes','',
       '- `manifest.json`: inventário por página, identificadores de imagem, vínculo entre semana e página de origem e hash de cada PDF.',
       '- `grade-6-contact.jpg` a `grade-9-contact.jpg`: páginas renderizadas para revisão visual.',
       '- Preservar a página de origem, a legenda e o contexto antes de recortar ilustrações para as aulas.',
       '- Fazer uma revisão pedagógica por semana e verificar legibilidade em celular após a integração.',
       '- Não confundir logos, ícones de seção e ornamentos com imagens de apoio à aprendizagem.','',
       '## Rastreabilidade das semanas','', '| Ano | Semana | Aula | Página do caderno | Imagens na aula |','| --- | ---: | --- | ---: | ---: |']
for grade in report['grades']:
    for week in grade['weeks']:lines.append(f"| {grade['grade']} | {week['week']} | {week['title']} | {week['sourcePage'] or 'verificar'} | {week['activeImageReferences']} |")
(OUT/'AUDITORIA.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='grades'}))
