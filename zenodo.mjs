import {showSaveFilePicker} from 'https://cdn.jsdelivr.net/npm/native-file-system-adapter/mod.js';

const getImages = (zenodoid,url,obj) => {
    if(!obj.metadata) {
        alert('ID not found.');
        document.getElementById('spinner').style.display = 'none';
        return;
    }
    const manifest = 
    {
        '@context': 'http://iiif.io/api/presentation/2/context.json',
        '@id': url,
        '@type': 'sc:Manifest',
        'label': obj.metadata.title,
        'attribution': obj.metadata.creators[0].name,
        'description': obj.metadata.description,
        'metadata': [],
        'sequences': [
            {
                '@type': 'sc:Sequence',
                '@id': `${url}/sequence/default`,
                'canvases': []
            }
        ]
    };
    manifest.metadata.push({'label': 'Title', 'value': obj.metadata.title});
    manifest.metadata.push({'label': 'Date', 'value': obj.metadata.publication_date});
    manifest.metadata.push({'label': 'License', 'value': obj.metadata.access_right});
    manifest.metadata.push({'label': 'Description', 'value': obj.metadata.description});

    const jregex = RegExp('\.jpe?g$','i');
    const pregex = RegExp('\.png$','i');
    const fnames = obj.files.reduce((acc,cur) => {
        if(jregex.test(cur.key))
            acc.push({type: 'image/jpeg',key: encodeURIComponent(cur.key)});
        else if(pregex.test(cur.key))
            acc.push({type: 'image/png',key: encodeURIComponent(cur.key)});
        return acc;
    },[]);
    fnames.sort((a,b) => {
       const sortregex = /^(\d+)([rv])?|(\d+)([rv])?.(?:jpg|jpeg|png)$/i;
       const resa = sortregex.exec(a.key);
       const resb = sortregex.exec(b.key);
       if(!resa||!resb) return 0;
       const inta = parseInt(resa[1]);
       const intb = parseInt(resb[1]);
       if(inta < intb)
            return -1;
       if(inta > intb)
           return 1;
       const arv = resa.length > 2 ? resa[2] : null;
       const brv = resb.length > 2 ? resb[2] : null;
       if(!arv || !brv) return 0;
       if(arv < brv) return -1;
       return 1;
    });
    const canvases = fnames.map((f,i) => {
     return {
            "@id": `${url}/canvas/${i}`,
            "@type": "sc:Canvas",
            "label": decodeURIComponent(f.key.replace(/\.[pj][pn]e?g$/, '')),
            "images": [
                {
                    "@id": `${url}/canvas/${i}/annotation/1`,
                    "on": `${url}/canvas/${i}`,
                    "@type": "ao:Annotation",
                    "motivation": "sc:painting",
                    "resource": {
                        "@id": `${url}/canvas/${i}/image/1`,
                        "@type":"dctypes:Image",
                        "format": f.type,
                        "service": {
                        }
                    }
                }
            ]
        };
    });
    Promise.all(fnames.map(i => fetch(`https://zenodo.org/api/iiif/record:${zenodoid}:${i.key}/info.json`).then(res => res.json())
         )).then(reses => makeManifest(manifest, canvases, reses))
           .catch(err => {
               alert(`Error: ${err}`);
               document.getElementById('spinner').style.display = 'none';
               return;
               });

};

const makeManifest = async (manifest, canvases, services) => {
    for(let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        const service = services[i];
        canvas.width = service.width;
        canvas.height = service.height;
        //service['@id'] = service.id;
        //delete service.id;
        canvas.images[0].resource.service = service;
        manifest.sequences[0].canvases.push(canvas);
    }
    const file = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    const fileHandle = await showSaveFilePicker({
        _preferPolyfill: false,
        suggestedName: 'manifest.json'
    });
    document.getElementById('spinner').style.display = 'none';
    const writer = await fileHandle.createWritable();
    writer.write(file);
    writer.close();
};

const go = async (e) => {
    document.getElementById('spinner').style.display = 'inline-block';
    const zenodoid = e.target.value;
    const url = `https://zenodo.org/api/records/${zenodoid}`;
    const res = await fetch(url);
    if(!res.ok) {
        alert(`Error: ${res.status}`);
        document.getElementById('spinner').style.display = 'none';
        return;
    }

    const json = await res.json();
    getImages(zenodoid,url,json);

};

const init = () => {
    const input = document.querySelector('input');
    input.addEventListener('keypress',(e) => {
        if(e.key === 'Enter')
            e.preventDefault();
            go(e);
    });
};

window.addEventListener('load',init);
