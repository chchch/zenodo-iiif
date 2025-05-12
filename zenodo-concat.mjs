import {showSaveFilePicker} from 'https://cdn.jsdelivr.net/npm/native-file-system-adapter/mod.js';

const go = async (e) => {
    document.getElementById('spinner').style.display = 'inline-block';
    const zenodoids = e.target.value.split(/\s+/);
    const urls = zenodoids.map(z => `https://zenodo.org/api/iiif/record:${z}/manifest`);
    const jsons = [];
    for(const url of urls) {
        const res = await fetch(url);
        if(!res.ok) {
            alert(`Error fetching ${url}: ${res.status}`);
            document.getElementById('spinner').style.display = 'none';
            return;
        }
        jsons.push(await res.json());
    }
    const first = jsons.shift();
    for(const json of jsons) {
        for(const s of json.sequences[0].canvases)
            first.sequences[0].canvases.push(s);
    }
    const file = new Blob([JSON.stringify(first)], {type: 'application/json'});
    const fileHandle = await showSaveFilePicker({
        _preferPolyfill: false,
        suggestedName: 'manifest.json'
    });
    document.getElementById('spinner').style.display = 'none';
    const writer = await fileHandle.createWritable();
    writer.write(file);
    writer.close();
};

const init = () => {
    const input = document.querySelector('input');
    input.addEventListener('keypress',(e) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            go(e);
        }
    });
};

window.addEventListener('load',init);
