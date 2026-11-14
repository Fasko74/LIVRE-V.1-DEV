import './style.css'
import Epub from 'epubjs'

const books = [
  { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", color: "#16382A", progress: 68 },
  { title: "L'Étranger", author: "Albert Camus", color: "#8A5A2B", progress: 12 },
  { title: "Le Prophète", author: "Khalil Gibran", color: "#3A5A6B", progress: 0 },
  { title: "Méditations", author: "Marc Aurèle", color: "#4A3B52", progress: 34 },
]

let currentPage = 'accueil'
let filter = ''
let currentBook = null
let rendition = null
let currentFileName = 'Mon livre'
let importedBooks = []
let fontSize = 18
let isSerif = true
let readerTheme = 'clair'
const app = document.querySelector('#app')

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('livre-db', 1)
    req.onupgradeneeded = () => { const db = req.result; if(!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function idbSaveBook(title, buffer){
  const db = await openDB()
  const id = Date.now().toString()
  const record = { id, title, author: 'Importé', color: '#16382A', progress: 0, data: buffer, addedAt: Date.now() }
  await new Promise((res, rej) => { const tx = db.transaction('books','readwrite'); tx.objectStore('books').put(record); tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
  return record
}
async function idbGetBooks(){
  const db = await openDB()
  return new Promise((res, rej) => { const tx = db.transaction('books','readonly'); const req = tx.objectStore('books').getAll(); req.onsuccess = () => res(req.result || []); req.onerror = () => rej(req.error) })
}
async function loadImported(){
  try{ importedBooks = await idbGetBooks(); render() }catch(e){}
}

function cover(b){ return `<div class="cover" style="background:${b.color}"><b>${b.title}</b><span>${b.author}</span></div>` }

function homePage(){
  const current = books[0]
  const allRecents = [...importedBooks.slice(-3).reverse(), ...books.slice(1)]
  return `
    <h1>Bonsoir.<br>Reprenons là où<br>tu t'étais arrêté.</h1>
    <p class="subtitle">${importedBooks.length} livre(s) importé(s) • Sauvegardé sur cet iPhone.</p>
    <div class="continue-card">${cover(current)}<div style="flex:1"><small style="opacity:.75;font-size:11px">LECTURE EN COURS</small><h3>${current.title}</h3><p>${current.author} • ${current.progress}%</p><div class="progress"><div style="width:${current.progress}%"></div></div><button class="btn-white" onclick="showPage('bibliotheque')">Importer un livre →</button></div></div>
    <h2>Ajoutés récemment</h2>
    <div class="scroll-row">${allRecents.map(b => `<div class="card" onclick="${b.id ? `openImportedBook('${b.id}')` : `showPage('bibliotheque')`}">${cover(b)}<h3>${b.title}</h3><p>${b.author}</p><span class="badge ${b.id ? 'badge-green' : ''}">${b.id ? 'Importé • Ouvrir' : (b.progress > 0 ? b.progress + '% lu' : 'Nouveau')}</span></div>`).join('')}</div>
  `
}
function libraryPage(){
  return `<h1>Ma bibliothèque</h1><p class="subtitle">${books.length + importedBooks.length} livres • ${importedBooks.length} importé(s) sauvegardé(s)</p><button class="btn btn-green" id="importBtn">+ Importer un EPUB</button><input type="file" id="fileInput" accept=".epub" hidden /><h2>Mes imports</h2>${importedBooks.length === 0 ? `<p>Aucun import pour l'instant. Importe Moby Dick pour tester, il restera ici même après rechargement.</p>` : `<div class="list">${importedBooks.map(b => `<div class="row" onclick="openImportedBook('${b.id}')">${cover(b)}<div class="row-info"><h3>${b.title}</h3><p>Importé • Appuie pour ouvrir</p></div><b>→</b></div>`).join('')}</div>`}<h2>Classiques</h2><div class="list">${books.map(b => `<div class="row">${cover(b)}<div class="row-info"><h3>${b.title}</h3><p>${b.author}</p><div class="progress"><div style="width:${b.progress}%"></div></div></div><b>${b.progress}%</b></div>`).join('')}</div>`
}
function discoverPage(){ return `<h1>Découvrir</h1><p class="subtitle">Une sélection calme, pour lire mieux.</p><div class="grid">${books.map(b => `<div class="card">${cover(b)}<h3>${b.title}</h3><p>${b.author}</p></div>`).join('')}</div>` }
function profilePage(){ return `<h1>Profil</h1><p class="subtitle">Ton espace lecteur.</p><div class="row"><div class="avatar">L</div><div class="row-info"><h3>Lecteur LIVRE.</h3><p>Compte gratuit • 0 € • ${importedBooks.length} livre(s) sauvegardé(s) sur cet appareil</p></div></div>` }

function render(){
  app.innerHTML = `<header><div class="logo">LIVRE<i>.</i></div><div class="avatar">L</div></header><main><section class="page ${currentPage === 'accueil' ? 'active' : ''}">${homePage()}</section><section class="page ${currentPage === 'bibliotheque' ? 'active' : ''}">${libraryPage()}</section><section class="page ${currentPage === 'decouvrir' ? 'active' : ''}">${discoverPage()}</section><section class="page ${currentPage === 'profil' ? 'active' : ''}">${profilePage()}</section></main><nav class="bottom-nav"><button data-page="accueil" class="${currentPage === 'accueil' ? 'active' : ''}"><span>⌂</span>Accueil</button><button data-page="bibliotheque" class="${currentPage === 'bibliotheque' ? 'active' : ''}"><span>▤</span>Biblio</button><button data-page="decouvrir" class="${currentPage === 'decouvrir' ? 'active' : ''}"><span>○</span>Découvrir</button><button data-page="profil" class="${currentPage === 'profil' ? 'active' : ''}"><span>◯</span>Profil</button></nav>`
  document.querySelectorAll('.bottom-nav button').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)))
  const importBtn = document.querySelector('#importBtn')
  const fileInput = document.querySelector('#fileInput')
  if(importBtn && fileInput){
    importBtn.addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', async (e) => { const f = e.target.files[0]; if(f) await openReader(f); e.target.value = '' })
  }
}

function applyReaderStyle(){
  if(!rendition) return
  rendition.themes.fontSize(fontSize + 'px')
  rendition.themes.font(isSerif ? 'Georgia, serif' : "'DM Sans', sans-serif")
  try{
    rendition.themes.register('clair', { body: { background: '#FFFDF7', color: '#1A1E1B' } })
    rendition.themes.register('sombre', { body: { background: '#1A1E1B', color: '#EDE6D6' } })
    rendition.themes.select(readerTheme)
  }catch(e){}
  const readerEl = document.querySelector('.reader')
  if(readerEl) readerEl.classList.toggle('dark', readerTheme === 'sombre')
}

async function openReader(file){
  const buffer = await file.arrayBuffer()
  const saved = await idbSaveBook(file.name.replace('.epub',''), buffer)
  importedBooks.push(saved)
  render()
  await openReaderFromBuffer(buffer, saved.title)
}

async function openImportedBook(id){
  const found = importedBooks.find(b => b.id === id)
  if(!found) return
  await openReaderFromBuffer(found.data, found.title)
}

async function openReaderFromBuffer(buffer, title){
  currentFileName = title
  let el = document.querySelector('#readerLayer')
  if(!el){
    el = document.createElement('div'); el.id = 'readerLayer'
    el.innerHTML = `<div class="reader"><div class="reader-top"><b id="readerTitle">LIVRE.</b><button id="closeReaderBtn">Fermer ✕</button></div><div class="reader-settings"><button id="fontMinus">A-</button><button id="fontPlus">A+</button><button id="fontToggle">Police : Serif</button><button id="themeToggle">Thème : Clair</button><button id="tocBtn">Sommaire</button></div><div class="reader-info" id="readerInfo">Chargement...</div><div id="tocPanel" class="toc-panel hidden"><div id="tocList"></div></div><div class="reader-viewer" id="viewer"></div><div class="reader-bottom"><button id="prevBtn">← Préc.</button><span id="pageInfo">Page 1</span><button id="nextBtn">Suiv. →</button></div></div>`
    document.body.appendChild(el)
  }
  el.style.display = 'block'
  document.querySelector('#readerTitle').textContent = currentFileName
  const info = document.querySelector('#readerInfo')
  info.textContent = 'Lecture du fichier...'
  try{
    if(currentBook){ try{ currentBook.destroy() }catch(e){} }
    currentBook = Epub(buffer)
    await currentBook.ready
    info.textContent = 'Livre chargé, affichage...'
    rendition = currentBook.renderTo('viewer', { width: '100%', height: '100%', flow: 'paginated', spread: 'none' })
    let pageNum = 1
    await rendition.display()
    applyReaderStyle()
    info.textContent = 'Bonne lecture.'
    document.querySelector('#closeReaderBtn').onclick = closeReader
    document.querySelector('#prevBtn').onclick = () => { rendition.prev(); if(pageNum>1) pageNum--; document.querySelector('#pageInfo').textContent = 'Page ' + pageNum }
    document.querySelector('#nextBtn').onclick = () => { rendition.next(); pageNum++; document.querySelector('#pageInfo').textContent = 'Page ' + pageNum }
    document.querySelector('#fontMinus').onclick = () => { if(fontSize > 13) fontSize -= 2; applyReaderStyle() }
    document.querySelector('#fontPlus').onclick = () => { if(fontSize < 28) fontSize += 2; applyReaderStyle() }
    document.querySelector('#fontToggle').onclick = (e) => { isSerif = !isSerif; e.target.textContent = isSerif ? 'Police : Serif' : 'Police : Sans'; applyReaderStyle() }
    document.querySelector('#themeToggle').onclick = (e) => { readerTheme = readerTheme === 'clair' ? 'sombre' : 'clair'; e.target.textContent = readerTheme === 'clair' ? 'Thème : Clair' : 'Thème : Sombre'; applyReaderStyle() }
    document.querySelector('#tocBtn').onclick = () => { document.querySelector('#tocPanel').classList.toggle('hidden') }
    currentBook.loaded.navigation.then(nav => {
      const list = document.querySelector('#tocList')
      if(!nav.toc || nav.toc.length === 0){ list.innerHTML = `<div class="toc-item">Pas de sommaire dans ce livre.</div>`; return }
      list.innerHTML = nav.toc.map(ch => `<div class="toc-item" data-href="${ch.href}">${ch.label}</div>`).join('')
      list.querySelectorAll('.toc-item').forEach(item => { item.onclick = () => { rendition.display(item.dataset.href); document.querySelector('#tocPanel').classList.add('hidden') } })
    })
  }catch(err){ info.textContent = 'Erreur : ' + (err.message || 'impossible de lire ce livre') }
}
function closeReader(){
  const el = document.querySelector('#readerLayer'); if(el) el.style.display = 'none'
  if(currentBook){ try{ currentBook.destroy() }catch(e){} }
  currentBook = null; rendition = null
}
window.showPage = (p) => { currentPage = p; render(); window.scrollTo(0,0) }
window.openReader = openReader
window.openImportedBook = openImportedBook
render()
loadImported()