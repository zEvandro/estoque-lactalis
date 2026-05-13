// ════ FIREBASE ════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDOXVL0k9RNPuOmlO_QwfuN0zDaZnENb6Q",
  authDomain: "base-lactalis.firebaseapp.com",
  databaseURL: "https://base-lactalis-default-rtdb.firebaseio.com",
  projectId: "base-lactalis",
  storageBucket: "base-lactalis.firebasestorage.app",
  messagingSenderId: "227431929273",
  appId: "1:227431929273:web:c1e4a0274edc4c93069268"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Autenticação anônima — garante token válido para as Security Rules do Firebase
firebase.auth().signInAnonymously().catch(err => console.warn('[Auth]', err.message));

// ════ CONFIG ADM ══════════════════════════════════════════════════
const APP_VERSION = 'v7.2.0';
const ADM_CRACHA = '564216';
const ADM_NOME   = 'Chicão';
// ADM_SENHA removida do código — carregada exclusivamente do Firebase (config/senhaAdm)

// ════ ESTADO ══════════════════════════════════════════════════════
let usuarioLogado    = null;
let marcaAtiva       = ''; // 'batavo' | 'itambe' | 'ambas'
let bases = {
  batavo: { dados:[], mapa:{}, carregada:false, arquivo:'', carregadoPor:'', carregadoEm:null },
  itambe: { dados:[], mapa:{}, carregada:false, arquivo:'', carregadoPor:'', carregadoEm:null }
};
let reservasDB   = {}; // { [idx]: { nome, cracha, hora } }
let baixadosDB   = {}; // { [idx]: true }
let bloqueiosDB  = {}; // { [idx]: { motivo, nome, cracha, hora, ts } }
let baixasDB     = []; // sorted array
let usuariosDB   = {}; // { [cracha]: { nome, basePerm } }
let logDB        = []; // sorted array of all actions
let loginAttemptsDB = []; // login attempts
let contagensDB  = {}; // { [idx]: { real, sistema, diff, nome, hora } }
let _relogioInterval  = null;
let _filtroLog        = 'todos';
let _filtroLogMarca   = 'todas';
let _filtroLogUsuario = 'todos';
let _filtroLogBusca   = '';
let _estaOnline  = false;
let _tabAtual    = 'consulta';

let _filtroVencCustom = false;
let _divergIdx   = null;
let _divergMarca = null;
let _divergMotivo = 'qtd';   // 'qtd' | 'data' | 'ambos'
let _divergFotoB64 = null;   // base64 da foto

let filtroAtivo      = 'todos';
let _filtroVencDias  = 2;
let _indice          = [];
let _marcaGerenciar  = '';
let _abasVisiveis    = [];

function normalizarUIVisual(){
  const setText=function(sel,txt){
    const el=document.querySelector(sel);
    if(el) el.textContent=txt;
  };
  const setHtml=function(sel,html){
    const el=document.querySelector(sel);
    if(el) el.innerHTML=html;
  };

  setHtml('.btn-consultor span','<i class="bi bi-eye"></i>');
  setText('.bs-logo','ESTOQUE CONTAGEM');
  const _titulo = marcaAtiva==='batavo' ? 'CONTAGEM BATAVO' : marcaAtiva==='itambe' ? 'CONTAGEM ITAMBÉ' : marcaAtiva==='ambas' ? 'CONTAGEM GERAL' : 'ESTOQUE CONTAGEM';
  setText('#headerTitulo', _titulo);
  setHtml('.btn-hamburguer','<i class="bi bi-list"></i>');

  const conn=document.getElementById('connPill');
  if(conn && /online/i.test(conn.textContent||'')) conn.textContent='Online';
  if(conn && /offline/i.test(conn.textContent||'')) conn.textContent='Offline';

  setHtml('#bsCardBatavo .bs-icon','<i class="bi bi-circle-fill"></i>');
  setHtml('#bsCardItambe .bs-icon','<i class="bi bi-circle-fill"></i>');
  setHtml('#baseCardBatavo .base-card-icon','<i class="bi bi-circle-fill"></i>');
  setHtml('#baseCardItambe .base-card-icon','<i class="bi bi-circle-fill"></i>');

  document.querySelectorAll('.search-icon').forEach(function(el){ el.innerHTML='<i class="bi bi-search"></i>'; });

  setHtml('#telaBaseSelect .btn-sair','<i class="bi bi-box-arrow-left"></i> Sair');
  setText('#offlineBanner','Modo offline - consultando cache local. Reservas nao serao salvas.');
  setText('#noDB','Base nao carregada. Aguarde o ADM carregar a base do dia.');

  setHtml('#installBanner > div:first-child','<i class="bi bi-phone"></i>');
  setHtml('.login-aviso-titulo','<i class="bi bi-card-text"></i> Sobre este aplicativo');
  setHtml('.login-aviso-alerta span:first-child','<i class="bi bi-exclamation-triangle"></i>');
  setHtml('.login-card-titulo','<i class="bi bi-shield-lock"></i> Acesso com cracha');

  const updateBtns=document.querySelectorAll('#updateBanner button');
  if(updateBtns[0]) updateBtns[0].innerHTML='<i class="bi bi-arrow-clockwise"></i> Atualizar';
  if(updateBtns[1]) updateBtns[1].innerHTML='<i class="bi bi-x-lg"></i>';
  const installBtns=document.querySelectorAll('#installBanner button');
  if(installBtns[1]) installBtns[1].innerHTML='<i class="bi bi-x-lg"></i>';

  setText('#filtroReserva','Aereo');
  setText('#filtroPicking','Picking');
  setText('#fv2','2 dias');
  setText('#fvCustom','Personalizado');
  setText('#logFiltroReserva','Reservas');
  setText('#logFiltroBaixa','Baixas');
  setText('#logFiltroBase','Bases');

  setHtml('#vazioVenc .icon','<i class="bi bi-check2-circle"></i>');
  setHtml('#vazioReservados .icon','<i class="bi bi-inboxes"></i>');
  setHtml('#vazioBaixas .icon','<i class="bi bi-graph-down-arrow"></i>');
  setHtml('#vazioLog .icon','<i class="bi bi-list-check"></i>');

  setHtml('#modalDiverg h3','<i class="bi bi-exclamation-triangle"></i> Registrar Divergencia');
  setHtml('#dmQtd','<i class="bi bi-box-seam"></i> Quantidade');
  setHtml('#dmData','<i class="bi bi-calendar-event"></i> Data');
  setHtml('#dmAmbos','<i class="bi bi-ui-checks-grid"></i> Ambos');
  setHtml('#dmEtiqueta','<i class="bi bi-tag"></i> Etiqueta trocada');
  setText('#divSecQtd > div:first-child','QUANTIDADE');
  setText('#divSecData > div:first-child','DATA DE VALIDADE');
  setText('#divSecEtiqueta > div:first-child','ETIQUETA TROCADA');
  setHtml('#modalDiverg button[onclick="tirarFoto()"]','<i class="bi bi-camera"></i> Tirar foto');
  setHtml('#modalDiverg button[onclick="escolherFoto()"]','<i class="bi bi-image"></i> Galeria');
  setHtml('#btnRemoverFoto','<i class="bi bi-x-lg"></i>');
  setHtml('#modalDiverg button[onclick="compartilharDivergencia()"]','<i class="bi bi-share"></i> Compartilhar');
  setHtml('#modalDiverg button[onclick="salvarDivergencia()"]','<i class="bi bi-floppy"></i> So salvar');

  setHtml('#modalAba h3','<i class="bi bi-table"></i> Selecionar Aba');

  const adminTitles=[
    '<i class="bi bi-shield-lock"></i> Alterar Senha ADM',
    '<i class="bi bi-person-plus"></i> Cadastrar Usuario',
    '<i class="bi bi-people"></i> Usuarios Cadastrados',
    '<i class="bi bi-shield-exclamation"></i> Tentativas de Login Invalidas',
    '<i class="bi bi-graph-down-arrow"></i> Baixas do Dia',
    '<i class="bi bi-trash3"></i> Resetar o Dia',
  ];
  document.querySelectorAll('#tab-admin .admin-section h3').forEach(function(el,idx){
    if(adminTitles[idx]) el.innerHTML=adminTitles[idx];
  });
  setHtml('#tab-admin button[onclick="alterarSenha()"]','<i class="bi bi-floppy"></i> Salvar nova senha');
  setHtml('#tab-admin button[onclick="limparLoginAttempts()"]','<i class="bi bi-trash3"></i> Limpar');
  setHtml('#tab-admin button[onclick="limparBaixas()"]','<i class="bi bi-trash3"></i> Limpar historico de baixas');
  setHtml('#tab-admin button[onclick="limparTudo()"]','<i class="bi bi-exclamation-octagon"></i> Limpar tudo e resetar o dia');
  setText('#novaBase option[value="batavo"]','Batavo');
  setText('#novaBase option[value="itambe"]','Itambe');
  setText('#novaBase option[value="ambas"]','Ambas');

  const modalTemas=document.getElementById('modalTemas');
  if(modalTemas){
    const h3=modalTemas.querySelector('h3');
    if(h3) h3.textContent='Escolher Tema';
    const labels=modalTemas.querySelectorAll('.tema-label');
    const nomes=['Dark Pro','Claro','Industrial','Oceano','Roxo'];
    labels.forEach(function(el,idx){ if(nomes[idx]) el.textContent=nomes[idx]; });
  }

  document.querySelectorAll('button').forEach(function(btn){
    if((btn.textContent||'').includes('Atualizar')) btn.innerHTML='<i class="bi bi-arrow-clockwise"></i> Atualizar';
  });

  const limparTextoUI=function(root){
    if(!root || !window.NodeFilter) return;
    const emojiRx=/[\u{1F300}-\u{1FAFF}]/gu;
    const normalizar=function(txt){
      if(!txt) return txt;
      return txt
        .replace(/⚠️?/g,'Atencao ')
        .replace(/[✅✓✔]/g,'OK')
        .replace(/⛔/g,'Bloqueado')
        .replace(/↩/g,'Voltar')
        .replace(/⏳/g,'Prazo')
        .replace(/➤/g,'>')
        .replace(/←/g,'<')
        .replace(emojiRx,'')
        .replace(/\s{2,}/g,' ');
    };
    const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode:function(node){
        const p=node.parentElement;
        if(!p) return NodeFilter.FILTER_REJECT;
        const tag=(p.tagName||'').toLowerCase();
        if(tag==='script' || tag==='style') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      const novo=normalizar(n.nodeValue);
      if(novo!==n.nodeValue) n.nodeValue=novo;
    });
  };

  limparTextoUI(document.body);
  if(!window.__uiCleanObserver){
    window.__uiCleanObserver=new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(node){
          if(node && node.nodeType===1) limparTextoUI(node);
          if(node && node.nodeType===3) {
            const txt=(node.nodeValue||'');
            const limpo=txt.replace(/[\u{1F300}-\u{1FAFF}]/gu,'');
            if(limpo!==txt) node.nodeValue=limpo;
          }
        });
      });
    });
    window.__uiCleanObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
}

// ════ FIREBASE LISTENERS ══════════════════════════════════════════
function initListeners() {
  // Indicador de conexão + offline mode
  db.ref('.info/connected').on('value', snap => {
    _estaOnline = snap.val() === true;
    const pill = document.getElementById('connPill');
    if (pill) {
      pill.textContent = _estaOnline ? 'Online' : 'Offline';
      pill.className   = 'conn-pill ' + (_estaOnline ? 'online' : 'offline');
      pill.textContent = _estaOnline ? 'Online' : 'Offline';
    }
    const banner = document.getElementById('offlineBanner');
    // Quando fica offline, tenta restaurar cache
    if (!_estaOnline) {
      const restaurou = restaurarCache();
      if (restaurou) {
        reconstruirIndice();
        atualizarStatus();
        if (appVisivel()) buscar();
      }
    }
    if (banner) banner.style.display = _estaOnline ? 'none' : '';
  });
  db.ref('bases/batavo').on('value', snap => {
    const v = snap.val();
    const eraCarregada = bases.batavo.carregada;
    if (v && v.carregada) {
      const d = Array.isArray(v.dados) ? v.dados : Object.values(v.dados || {});
      bases.batavo = { dados: d, mapa: v.mapa||{}, carregada:true, arquivo:v.arquivo||'', carregadoPor:v.carregadoPor||'', carregadoEm:v.carregadoEm||null };
      if (!eraCarregada && appVisivel()) toastEspecial('Base Batavo carregada por ' + bases.batavo.carregadoPor + '!', 'notif-base');
    } else {
      bases.batavo = { dados:[], mapa:{}, carregada:false, arquivo:'', carregadoPor:'', carregadoEm:null };
    }
    onBaseAtualizada();
  });

  db.ref('bases/itambe').on('value', snap => {
    const v = snap.val();
    const eraCarregada = bases.itambe.carregada;
    if (v && v.carregada) {
      const d = Array.isArray(v.dados) ? v.dados : Object.values(v.dados || {});
      bases.itambe = { dados: d, mapa: v.mapa||{}, carregada:true, arquivo:v.arquivo||'', carregadoPor:v.carregadoPor||'', carregadoEm:v.carregadoEm||null };
      if (!eraCarregada && appVisivel()) toastEspecial('Base Itambe carregada por ' + bases.itambe.carregadoPor + '!', 'notif-base');
    } else {
      bases.itambe = { dados:[], mapa:{}, carregada:false, arquivo:'', carregadoPor:'', carregadoEm:null };
    }
    onBaseAtualizada();
  });

  db.ref('reservas').on('value', snap => {
    const novas = snap.val() || {};
    // Aviso se produto visível na tela foi reservado por outro usuário
    if (appVisivel() && usuarioLogado) {
      Object.entries(novas).forEach(([idx, info]) => {
        if (reservasDB[idx]) return; // já estava reservado
        if (info.cracha === usuarioLogado.cracha) return; // eu mesmo reservei
        // Verifica se está na lista visível
        const lista = document.getElementById('listaResultados');
        if (lista && lista.innerHTML.includes(idx.split('_')[1])) {
          const marca = idx.startsWith('batavo') ? 'batavo' : 'itambe';
          const b = bases[marca];
          const item = b?.dados.find(r => r._idx === idx);
          const cod = item ? (item[b.mapa.codigo] ?? idx) : idx;
          toastEspecial('Alerta: ' + info.nome + ' reservou ' + cod + ' agora!', 'notif-reserva');
        }
      });
    }
    reservasDB = novas;
    reconstruirIndice();
    if (appVisivel()) { buscar(); renderReservados(); atualizarStatus(); }
  });

  db.ref('baixados').on('value', snap => {
    baixadosDB = snap.val() || {};
    reconstruirIndice();
    if (appVisivel()) { buscar(); renderReservados(); }
  });

  db.ref('bloqueios').on('value', snap => {
    bloqueiosDB = snap.val() || {};
    reconstruirIndice();
    if (appVisivel()) { buscar(); renderReservados(); }
  });

  db.ref('baixas').on('value', snap => {
    const raw = snap.val() || {};
    baixasDB = Object.values(raw).sort((a,b) => (b.ts||0)-(a.ts||0));
    if (appVisivel()) { renderBaixas(); renderResumoBaixas(); atualizarStatus(); }
  });

  db.ref('usuarios').on('value', snap => {
    usuariosDB = snap.val() || {};
    if (appVisivel()) renderUsuarios();
  });

  db.ref('log').on('value', snap => {
    const raw = snap.val() || {};
    logDB = Object.values(raw).sort((a,b) => (b.ts||0) - (a.ts||0));
    if (appVisivel()) { renderLog(); atualizarBadgeLog(); }
  });

  db.ref('loginAttempts').on('value', snap => {
    const raw = snap.val() || {};
    loginAttemptsDB = Object.values(raw).sort((a,b) => (b.ts||0)-(a.ts||0));
    if (appVisivel()) renderLoginAttempts();
  });

  db.ref('contagens').on('value', snap => {
    contagensDB = snap.val() || {};
  });
}

function onBaseAtualizada() {
  reconstruirIndice();
  atualizarStatus();
  atualizarBaseSelectCards();
  normalizarUIVisual();
  salvarCache(); // persiste localmente para uso offline
  if (appVisivel()) {
    buscar();
    atualizarCardsBase();
    renderReservados();
  }
}

function appVisivel() {
  return document.getElementById('appPrincipal').style.display !== 'none';
}

// ════ SEGURANÇA — BLOQUEIO POR TENTATIVAS ════════════════════════
const LOCKOUT_KEY      = 'estoque-lockout';
const MAX_TENTATIVAS   = 5;
const LOCKOUT_DURACAO  = 5 * 60 * 1000; // 5 minutos em ms

function verificarBloqueio() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
    if (d.ate && Date.now() < d.ate) {
      const mins = Math.ceil((d.ate - Date.now()) / 60000);
      return `Acesso bloqueado. Tente novamente em ${mins} min.`;
    }
    if (d.ate && Date.now() >= d.ate) localStorage.removeItem(LOCKOUT_KEY);
    return null;
  } catch(e) { return null; }
}

function registrarFalha() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
    const tentativas = (d.tentativas || 0) + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ tentativas, ate: Date.now() + LOCKOUT_DURACAO }));
    } else {
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ tentativas }));
    }
  } catch(e) {}
}

function limparBloqueio() {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch(e) {}
}

// ════ LOGIN ═══════════════════════════════════════════════════════
function fazerLogin() {
  const cracha = document.getElementById('loginCracha').value.trim();
  const errEl  = document.getElementById('loginErro');
  errEl.textContent = '';

  // ── Verificar bloqueio por tentativas ──
  const bloqueio = verificarBloqueio();
  if (bloqueio) { errEl.textContent = bloqueio; return; }

  if (!cracha) { errEl.textContent = 'Digite seu crachá'; return; }

  if (cracha === ADM_CRACHA) {
    const wrap = document.getElementById('loginSenhaWrap');
    if (wrap.style.display === 'none') {
      wrap.style.display = '';
      document.getElementById('loginSenha').focus();
      return;
    }
    const senha = document.getElementById('loginSenha').value;
    if (_senhaAdm === null) {
      errEl.textContent = 'Aguardando configuração do servidor. Verifique a conexão.';
      carregarSenhaAdm();
      return;
    }
    if (senha !== _senhaAdm) {
      registrarFalha();
      errEl.textContent = 'Senha incorreta';
      return;
    }
    limparBloqueio();
    usuarioLogado = { nome: ADM_NOME, cracha: ADM_CRACHA, perfil: 'adm' };
    marcaAtiva = 'ambas';
    salvarSessao();
    irParaApp();
    return;
  }

  // Usuário comum — consulta Firebase
  db.ref('usuarios/' + cracha).get().then(snap => {
    if (!snap.exists()) {
      registrarFalha();
      const tentativas = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}').tentativas || 0;
      const restam = MAX_TENTATIVAS - tentativas;
      errEl.textContent = restam > 0
        ? `Crachá não cadastrado. ${restam} tentativa(s) restante(s).`
        : 'Acesso bloqueado por 5 minutos.';
      db.ref('loginAttempts').push({ cracha, hora: new Date().toLocaleString('pt-BR'), ts: Date.now() }).catch(()=>{});
      return;
    }
    limparBloqueio();
    const u = snap.val();
    usuarioLogado = { nome: u.nome, cracha: String(cracha), perfil: 'comum', basePerm: u.basePerm||'ambas' };
    salvarSessao();
    irParaBaseSelect();
  }).catch(() => {
    errEl.textContent = 'Erro de conexão. Verifique a internet.';
  });
}

function entrarComoConsultor() {
  // Acesso de leitura sem cadastro — sem sessão persistida
  usuarioLogado = { nome: 'Consultor', cracha: 'guest', perfil: 'guest' };
  marcaAtiva = 'ambas';
  irParaApp();
}

function fazerLogout() {
  usuarioLogado = null;
  marcaAtiva = '';
  limparSessao();
  document.body.classList.remove('marca-batavo','marca-itambe');
  const logoEl = document.getElementById('headerLogo');
  const tituloEl = document.getElementById('headerTitulo');
  if (logoEl) { logoEl.src = ''; logoEl.style.display = 'none'; }
  if (tituloEl) tituloEl.textContent = 'ESTOQUE CONTAGEM';
  document.getElementById('appPrincipal').style.display = 'none';
  document.getElementById('telaBaseSelect').style.display = 'none';
  document.getElementById('telaLogin').style.display = '';
  document.getElementById('loginCracha').value = '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('loginSenhaWrap').style.display = 'none';
  document.getElementById('loginErro').textContent = '';
  document.body.classList.remove('marca-batavo','marca-itambe');
  pararRelogio();
  const headerUser = document.getElementById('headerUser');
  if (headerUser) headerUser.textContent = '';
  _filtroLog = 'todos';
  _filtroLogMarca = 'todas';
  _filtroLogUsuario = 'todos';
  _filtroLogBusca = '';
  const logBusca = document.getElementById('logBusca');
  if (logBusca) logBusca.value = '';
  const logSel = document.getElementById('logFiltroUsuario');
  if (logSel) { logSel.innerHTML = '<option value="todos">Todos os operadores</option>'; }
}

// ════ NAVEGAÇÃO ════════════════════════════════════════════════════
function irParaBaseSelect() {
  // Usuário com permissão 'ambas' vai direto pro app com as duas bases
  if (usuarioLogado.basePerm === 'ambas') {
    marcaAtiva = 'ambas';
    irParaApp();
    return;
  }
  document.getElementById('telaLogin').style.display = 'none';
  document.getElementById('appPrincipal').style.display = 'none';
  document.getElementById('telaBaseSelect').style.display = '';
  document.getElementById('bsUserInfo').textContent = 'Olá, ' + usuarioLogado.nome + ' · Crachá ' + usuarioLogado.cracha;
  atualizarBaseSelectCards();
}

function irParaApp() {
  document.getElementById('telaLogin').style.display = 'none';
  document.getElementById('telaBaseSelect').style.display = 'none';
  document.getElementById('appPrincipal').style.display = '';
  document.body.classList.remove('marca-batavo','marca-itambe');
  const logoEl   = document.getElementById('headerLogo');
  const tituloEl = document.getElementById('headerTitulo');
  const userEl   = document.getElementById('headerUser');
  if (marcaAtiva === 'batavo') {
    document.body.classList.add('marca-batavo');
    if (logoEl)  { logoEl.src = './assets/images/batavo.png'; logoEl.style.display = ''; }
    if (tituloEl) tituloEl.textContent = 'CONTAGEM BATAVO';
  } else if (marcaAtiva === 'itambe') {
    document.body.classList.add('marca-itambe');
    if (logoEl)  { logoEl.src = './assets/images/itambe.png'; logoEl.style.display = ''; }
    if (tituloEl) tituloEl.textContent = 'CONTAGEM ITAMBÉ';
  } else if (marcaAtiva === 'ambas') {
    if (logoEl)  { logoEl.src = ''; logoEl.style.display = 'none'; }
    if (tituloEl) tituloEl.textContent = 'CONTAGEM GERAL';
  } else {
    if (logoEl)  { logoEl.src = ''; logoEl.style.display = 'none'; }
    if (tituloEl) tituloEl.textContent = 'ESTOQUE CONTAGEM';
  }
  if (userEl && usuarioLogado) userEl.textContent = usuarioLogado.nome;
  iniciarRelogio();
  configurarTabs();
  reconstruirIndice();
  atualizarStatus();
  buscar();
  normalizarUIVisual();
}

function selecionarBase(marca) {
  const perm = usuarioLogado?.basePerm || 'ambas';
  if (perm !== 'ambas' && perm !== marca) {
    toast('Acesso negado para a base ' + (marca === 'batavo' ? 'Batavo' : 'Itambe'));
    return;
  }
  if (!bases[marca].carregada) { toast('Base nao disponivel. Aguarde o ADM.'); return; }
  marcaAtiva = marca;
  salvarSessao();
  irParaApp();
}

function atualizarBaseSelectCards() {
  if (document.getElementById('telaBaseSelect').style.display === 'none') return;
  const perm = usuarioLogado?.basePerm || 'ambas';
  ['batavo','itambe'].forEach(m => {
    const cap    = m === 'batavo' ? 'Batavo' : 'Itambe';
    const card   = document.getElementById('bsCard' + cap);
    const status = document.getElementById('bsStatus' + cap);
    if (!card || !status) return;
    const b           = bases[m];
    const temPermissao = perm === 'ambas' || perm === m;

    if (!temPermissao) {
      // Sem permissão — bloqueia independente de estar carregada
      card.className = 'bs-card ' + m + ' indisponivel';
      status.innerHTML = '<span class="bs-status bs-no">Sem permissao</span>' +
        '<div class="bs-aviso">Contate o ADM para liberar acesso</div>';
    } else if (b.carregada) {
      card.className = 'bs-card ' + m + ' disponivel';
      status.innerHTML = '<span class="bs-status bs-ok">Disponivel</span>' +
        '<div class="bs-arquivo">' + b.arquivo + '</div>' +
        '<div class="bs-arquivo">Por ' + b.carregadoPor + '</div>';
    } else {
      card.className = 'bs-card ' + m + ' indisponivel';
      status.innerHTML = '<span class="bs-status bs-no">Base ausente</span>' +
        '<div class="bs-aviso">Não houve contagem hoje</div>';
    }
  });
}

// ════ DRAWER ══════════════════════════════════════════════════════
function abrirDrawer() {
  document.getElementById('drawer').classList.add('show');
  document.getElementById('drawerOverlay').classList.add('show');
  renderDrawer();
}
function fecharDrawer() {
  document.getElementById('drawer').classList.remove('show');
  document.getElementById('drawerOverlay').classList.remove('show');
}

function renderDrawer() {
  const isAdm = usuarioLogado?.perfil === 'adm';

  // Header do drawer
  document.getElementById('drawerUser').textContent = '👤 ' + (usuarioLogado?.nome || '');
  document.getElementById('drawerSub').textContent  = marcaAtiva === 'ambas' ? 'Acesso completo' : 'Base ' + (marcaAtiva === 'batavo' ? 'Batavo' : 'Itambé');

  // Pills de base
  const pillsEl = document.getElementById('drawerPills');
  let pills = '';
  if (marcaAtiva === 'ambas' || marcaAtiva === 'batavo')
    pills += '<span class="drawer-pill batavo">🟢 BATAVO</span>';
  if (marcaAtiva === 'ambas' || marcaAtiva === 'itambe')
    pills += '<span class="drawer-pill itambe">🔵 ITAMBÉ</span>';
  pillsEl.innerHTML = pills;

  // Nav items
  const vencCount    = document.getElementById('badgeVenc')?.textContent || '';
  const resCount     = document.getElementById('badgeRes')?.textContent  || '';

  const items = isAdm ? [
    { id:'consulta',    icon:'🔍', label:'Consulta' },
    { id:'vencimentos', icon:'⏳', label:'Vencimentos', badge: vencCount },
    { id:'reservados',  icon:'📋', label:'Reservados',  badge: resCount },
    { id:'baixas',      icon:'📉', label:'Baixas' },
    { id:'log',         icon:'📋', label:'Log' },
    { sep: true },
    { id:'base',  icon:'📂', label:'Base de Dados' },
    { id:'admin', icon:'👑', label:'Admin' },
    { sep: true },
    { id:'_temas', icon:'🎨', label:'Temas' },
  ] : usuarioLogado?.perfil === 'guest' ? [
    { id:'consulta', icon:'🔍', label:'Consulta' },
    { sep: true },
    { id:'_temas',   icon:'🎨', label:'Temas' },
  ] : [
    { id:'consulta',    icon:'🔍', label:'Consulta' },
    { id:'vencimentos', icon:'⏳', label:'Vencimentos', badge: vencCount },
    { sep: true },
    { id:'_temas',      icon:'🎨', label:'Temas' },
    { id:'_trocarbase', icon:'🔄', label:'Trocar Base' },
  ];

  const nav = document.getElementById('drawerNav');
  nav.innerHTML = items.map(it => {
    if (it.sep) return '<div class="drawer-sep"></div>';
    const isActive = it.id === _tabAtual;
    const badge    = it.badge ? '<span class="drawer-item-badge">' + it.badge + '</span>' : '';
    return '<div class="drawer-item' + (isActive ? ' active' : '') + '" onclick="drawerNavegar(\'' + it.id + '\')">' +
      '<span class="drawer-item-icon">' + it.icon + '</span>' +
      '<span class="drawer-item-label">' + it.label + '</span>' +
      badge +
    '</div>';
  }).join('');
}

function drawerNavegar(id) {
  fecharDrawer();
  if (id === '_temas')      { abrirTemas(); return; }
  if (id === '_trocarbase') { irParaBaseSelect(); return; }
  showTab(id);
}

// ════ TABS (mantido internamente para controle de conteúdo) ════════
function configurarTabs() {
  const isAdm   = usuarioLogado && usuarioLogado.perfil === 'adm';
  const isGuest = usuarioLogado && usuarioLogado.perfil === 'guest';
  const tabs = isAdm
    ? ['consulta','vencimentos','reservados','baixas','log','base','admin']
    : isGuest
      ? ['consulta']                    // consultor: só consulta, sem ações
      : ['consulta','vencimentos'];     // operador: consulta + vencimentos
  _abasVisiveis = tabs;
  // Esconde todos e mostra só consulta
  ['consulta','vencimentos','reservados','baixas','log','base','admin'].forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) el.style.display = _abasVisiveis.includes(id) ? (id==='consulta'?'':'none') : 'none';
  });
}

function showTab(t) {
  _tabAtual = t;
  _abasVisiveis.forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) el.style.display = id === t ? '' : 'none';
  });
  if (t === 'reservados')  renderReservados();
  if (t === 'baixas')      renderBaixas();
  if (t === 'consulta')    { buscar(); }
  if (t === 'vencimentos') renderVencimentos();
  if (t === 'log')         renderLog();
  if (t === 'admin')       { renderUsuarios(); renderResumoBaixas(); renderLoginAttempts(); }
}

// ════ MAPEAMENTO ══════════════════════════════════════════════════
function detectarMapa(cols) {
  const c = cols.map(s => String(s).toLowerCase().trim());
  const find = (...keys) => {
    let i = c.findIndex(col => keys.some(k => col === k));
    if (i >= 0) return cols[i];
    i = c.findIndex(col => keys.some(k => col.startsWith(k)));
    if (i >= 0) return cols[i];
    i = c.findIndex(col => keys.some(k => col.includes(k)));
    return i >= 0 ? cols[i] : '';
  };
  const descricao = find('descri','produto','product','nome','name');
  const dtFabCol = (() => {
    const keys = ['fabricação','fabricacao','dt_fab','_fab','fabric','fab','manuf','data fab','dt fab'];
    for (const k of keys) {
      const i = c.findIndex(col => col.includes(k));
      if (i >= 0 && cols[i] !== descricao) return cols[i];
    }
    return '';
  })();
  return {
    codigo:    find('cod','codigo','code','sku','ref'),
    descricao,
    caixas:    find('caixa','cx','qty','qtd','quant','box','und por cx','und/cx'),
    dtFab:     dtFabCol,
    dtVal:     find('validade','dt_val','_val','valid','expir','venc','val'),
    lote:      find('lote','lot','batch'),
    endereco:  find('endereço','endereco','ender','addr','local','end','posit'),
  };
}

// ════ UPLOAD BASE (ADM) ══════════════════════════════════════════
let _marcaGerenciarUpload = '';

function cardClick(m) {
  if (bases[m].carregada) abrirGerenciar(m);
  else {
    _marcaGerenciarUpload = m;
    document.getElementById(m === 'batavo' ? 'fileInputBatavo' : 'fileInputItambe').click();
  }
}

function abrirGerenciar(m) {
  _marcaGerenciar = m;
  _marcaGerenciarUpload = m;
  const b = bases[m];
  document.getElementById('modalGerenciarCard').className = 'modal-gerenciar ' + m;
  document.getElementById('modalBaseIcone').textContent   = m==='batavo' ? '🟢' : '🔵';
  document.getElementById('modalBaseTitulo').textContent  = m==='batavo' ? 'BATAVO' : 'ITAMBÉ';
  document.getElementById('modalBaseArquivo').textContent = '📄 ' + b.arquivo;
  document.getElementById('modalBaseContagem').textContent =
    b.dados.filter(r => !baixadosDB[r._idx] && !reservasDB[r._idx]).length + ' em estoque · ' +
    Object.keys(reservasDB).filter(idx => idx.startsWith(m + '_')).length + ' reservados';
  document.getElementById('btnSubstituir').className = 'btn-acao-base substituir ' + m;
  document.getElementById('modalBase').classList.add('show');
}

function prepararUpload() {
  fecharModalBase();
  document.getElementById(_marcaGerenciarUpload === 'batavo' ? 'fileInputBatavo' : 'fileInputItambe').click();
}

function fecharModalBase() { document.getElementById('modalBase').classList.remove('show'); }

function retirarBase() {
  fecharModalBase();
  const m = _marcaGerenciar;
  const cap = m === 'batavo' ? 'Batavo' : 'Itambé';
  confirmar('Retirar base ' + cap + '?', 'Os dados serão removidos do servidor para todos os usuários.', () => {
    const upd = {};
    upd['bases/' + m] = { carregada: false };
    Object.keys(reservasDB).forEach(idx => { if (idx.startsWith(m + '_')) upd['reservas/' + idx] = null; });
    Object.keys(baixadosDB).forEach(idx => { if (idx.startsWith(m + '_')) upd['baixados/' + idx] = null; });
    db.ref().update(upd).then(() => toast('Base ' + cap + ' retirada'));
  });
}

let _wbCache = null;      // workbook em memória aguardando seleção de aba
let _wbMarca = null;      // marca aguardando seleção de aba
let _wbFile  = null;      // nome do arquivo

function processarArquivo(file, marca) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, { type:'array', cellDates:false, raw:false, cellFormula:false, dateNF:'dd/mm/yyyy' });

      // Se tem mais de 1 aba, mostra seletor
      if (wb.SheetNames.length > 1) {
        _wbCache = wb;
        _wbMarca = marca;
        _wbFile  = file.name;
        abrirModalAba(wb);
        return;
      }

      // Arquivo com aba única — processa direto
      processarSheet(wb, wb.SheetNames[0], marca, file.name);
    } catch(err) { toast('Erro: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function abrirModalAba(wb) {
  const lista = document.getElementById('listaAbas');
  lista.innerHTML = wb.SheetNames.map((nome, i) => {
    const ws   = wb.Sheets[nome];
    const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false, header:1 });
    // Pega os headers da primeira linha não vazia
    const headerRow = rows.find(r => r.some(c => c && String(c).trim()));
    const headers   = headerRow ? headerRow.filter(c => c).slice(0, 5).join(', ') : '(sem colunas visíveis)';
    const nLinhas   = rows.length > 1 ? rows.length - 1 + ' linhas' : '(vazia)';
    return '<div onclick="selecionarAba(\'' + nome.replace(/'/g,"\\'") + '\')" style="background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:12px 14px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
      '<div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:3px">📋 ' + nome + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + nLinhas + ' · ' + headers + '</div>' +
    '</div>';
  }).join('');
  document.getElementById('modalAba').classList.add('show');
}

function fecharModalAba() {
  document.getElementById('modalAba').classList.remove('show');
  _wbCache = _wbMarca = _wbFile = null;
}

function selecionarAba(nomeAba) {
  if (!_wbCache || !_wbMarca) return;
  fecharModalAba();
  processarSheet(_wbCache, nomeAba, _wbMarca, _wbFile);
}

function processarSheet(wb, nomAba, marca, nomeArquivo) {
  try {
    const ws   = wb.Sheets[nomAba];
    const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
    if (!rows.length) { toast('Aba "' + nomAba + '" esta vazia'); return; }

    const primeiraLinha = {};
    Object.keys(rows[0]).forEach(k => {
      const chave = k.replace(/[.#$\[\]/\s]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'col0';
      primeiraLinha[chave] = rows[0][k];
    });
    const mapa = detectarMapa(Object.keys(primeiraLinha));
    if (!mapa.codigo) { toast('Coluna de codigo nao encontrada na aba "' + nomAba + '"'); return; }

    const sanitize = s => s ? s.replace(/[.#$\[\]/\s]/g, '_').replace(/_+/g,'_').replace(/^_|_$/g,'') : '';
    const mapaSanitizado = {};
    Object.entries(mapa).forEach(([k,v]) => { mapaSanitizado[k] = sanitize(v); });

    const dados = (() => {
      const seenCodes = new Set(); // detecta códigos duplicados na mesma planilha
      return rows.map((r, i) => {
        // 1. Sanitiza todos os campos primeiro
        const limpo = {};
        Object.entries(r).forEach(([k,v]) => {
          const chave = k.replace(/[.#$\[\]/\s]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'col' + i;
          limpo[chave] = (typeof v==='string' && v.startsWith('=')) ? '' : v;
        });

        // 2. Extrai o código do produto para usar como chave estável
        const codBruto  = mapaSanitizado.codigo ? String(limpo[mapaSanitizado.codigo] ?? '').trim() : '';
        const codKey    = sanitize(codBruto);

        // 3. Monta _idx: código único → "marca_COD"; duplicado → "marca_COD_i"; vazio → "marca_row_i"
        let idxSufixo;
        if (codKey && !seenCodes.has(codKey)) {
          idxSufixo = codKey;
          seenCodes.add(codKey);
        } else if (codKey) {
          idxSufixo = codKey + '_' + i; // duplicata: usa código + posição
        } else {
          idxSufixo = 'row_' + i;       // sem código: fallback seguro
        }
        limpo._idx = marca + '_' + idxSufixo;
        return limpo;
      });
    })();

    toast('Salvando no servidor...');
    const upd = {};
    Object.keys(reservasDB).forEach(idx => { if (idx.startsWith(marca + '_')) upd['reservas/' + idx] = null; });
    Object.keys(baixadosDB).forEach(idx => { if (idx.startsWith(marca + '_')) upd['baixados/' + idx] = null; });
    if (Object.keys(upd).length) db.ref().update(upd);

    db.ref('bases/' + marca).set({
      carregada: true,
      arquivo: nomeArquivo + (nomAba ? ' [' + nomAba + ']' : ''),
      mapa: mapaSanitizado,
      dados,
      carregadoPor: usuarioLogado ? usuarioLogado.nome : 'ADM',
      carregadoEm: Date.now()
    }).then(() => {
      const cap = marca === 'batavo' ? 'Batavo' : 'Itambé';
      toast('Sucesso: ' + dados.length + ' registros ' + cap + ' carregados - Aba: ' + nomAba);
      registrarLog('base', { marca, arquivo: nomeArquivo, total: dados.length });
      showTab('consulta');
    }).catch(e => toast('Erro ao salvar: ' + e.message));
  } catch(err) { toast('Erro: ' + err.message); }
}

function atualizarCardsBase() {
  ['batavo','itambe'].forEach(m => {
    const b   = bases[m];
    const cap = m === 'batavo' ? 'Batavo' : 'Itambe';
    const card      = document.getElementById('baseCard' + cap);
    const elArq     = document.getElementById('arquivo' + cap);
    const elMeta    = document.getElementById('meta' + cap);
    const elAction  = document.getElementById('action' + cap);
    const elBadge   = document.getElementById('badge' + cap);
    if (!card || !elArq) return;
    if (b.carregada) {
      card.classList.add('loaded');
      elArq.textContent = b.arquivo; elArq.classList.remove('vazio');
      if (elMeta) {
        const em  = b.carregadoEm ? new Date(b.carregadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
        const mp  = b.mapa || {};
        const diagn = [
          mp.dtVal    ? '✅ Val: ' + mp.dtVal    : '❌ Validade NÃO detectada',
          mp.dtFab    ? '✅ Fab: ' + mp.dtFab    : '⚠️ Fabricação não detectada',
          mp.endereco ? '✅ End: ' + mp.endereco : '⚠️ Endereço não detectado',
          mp.caixas   ? '✅ Cx: '  + mp.caixas   : '⚠️ Caixas não detectado',
        ].join('  ·  ');
        elMeta.innerHTML = 'Por ' + b.carregadoPor + (em ? ' às ' + em : '') +
          '<div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.6">' + diagn + '</div>';
      }
      if (elAction) elAction.textContent = '✎ Clique para gerenciar';
      if (elBadge)  elBadge.textContent  = 'CARREGADO';
    } else {
      card.classList.remove('loaded');
      elArq.textContent = 'Nenhum arquivo carregado'; elArq.classList.add('vazio');
      if (elMeta)   elMeta.innerHTML    = '';
      if (elAction) elAction.textContent = '+ Clique para carregar';
      if (elBadge)  elBadge.textContent  = '';
    }
  });
}

// ════ ÍNDICE ══════════════════════════════════════════════════════
function reconstruirIndice() {
  const hoje = Date.now();
  _indice = [];
  const marcas = marcaAtiva === 'ambas' ? ['batavo','itambe'] : (marcaAtiva ? [marcaAtiva] : []);
  marcas.forEach(m => {
    const b = bases[m];
    if (!b.carregada) return;
    b.dados.forEach(r => {
      const idx = r._idx;
      if (!idx) return;
      if (reservasDB[idx]) return;
      if (baixadosDB[idx]) return;
      const valTs    = parseData(r[b.mapa.dtVal]);
      const diasVal  = valTs === Infinity ? null : Math.ceil((valTs - hoje) / 86400000);
      const bloqueio = bloqueiosDB[idx] || null;
      _indice.push({
        _ref: r, _marca: m,
        _cod:      String(r[b.mapa.codigo]    ?? '').toLowerCase(),
        _desc:     String(r[b.mapa.descricao] ?? '').toLowerCase(),
        _end:      String(r[b.mapa.endereco]  ?? ''),
        _fab:      parseData(r[b.mapa.dtFab]),
        _diasVal:  diasVal,
        _bloqueio: bloqueio,
        cod:  r[b.mapa.codigo]    ?? '—',
        desc: r[b.mapa.descricao] ?? '—',
        cx:   r[b.mapa.caixas]    ?? '',
        fab:  fmtData(r[b.mapa.dtFab]),
        val:  fmtData(r[b.mapa.dtVal]),
        end:  r[b.mapa.endereco]  ?? '',
      });
    });
  });
  // Pré-ordena por data de fabricação (evita ordenar a cada busca)
  _indice.sort((a,b) => a._fab - b._fab);
}

// ════ STATUS ══════════════════════════════════════════════════════
function atualizarStatus() {
  const total = _indice.length;
  const resCount = Object.keys(reservasDB).filter(idx => {
    if (marcaAtiva === 'ambas') return true;
    return idx.startsWith(marcaAtiva + '_');
  }).length;
  const ok = total > 0 || resCount > 0;
  const noDB = document.getElementById('noDB');
  if (noDB) noDB.style.display = ok ? 'none' : '';

  // Atualiza rodapé do drawer
  const drawerEstoque = document.getElementById('drawerEstoque');
  if (drawerEstoque) drawerEstoque.textContent = ok ? total + ' em estoque' : 'sem base';

  // Badges guardados em variáveis para o drawer ler
  const vCount = _indice.filter(e => e._diasVal !== null && e._diasVal <= 30).length;
  // Atualiza drawer se estiver aberto
  if (document.getElementById('drawer')?.classList.contains('show')) renderDrawer();

  atualizarCardsBase();
}

// ════ BUSCA ═══════════════════════════════════════════════════════
let _buscarTimer = null;
function debounceBuscar() {
  clearTimeout(_buscarTimer);
  const q = document.getElementById('searchInput')?.value.trim() ?? '';
  // Se tem query, espera 180ms após parar de digitar; se apagou tudo, atualiza na hora
  if (q.length === 0) { buscar(); return; }
  _buscarTimer = setTimeout(buscar, 180);
}

function setFiltro(f) {
  filtroAtivo = f;
  ['Todos','Reserva','Picking'].forEach(n => {
    document.getElementById('filtro' + n)?.classList.toggle('active', f === n.toLowerCase());
  });
  buscar();
}

function buscar() {
  const q     = document.getElementById('searchInput')?.value.trim().toLowerCase() ?? '';
  const lista = document.getElementById('listaResultados');
  const stats = document.getElementById('statsBar');
  if (!lista) return;

  // Detecta busca por endereço: começa com letra seguida de espaço/número (ex: "a 001", "b003")
  const isEndBusca = q.length >= 2 && /^[a-z]\s*\d/.test(q);

  let res;
  if (q.length === 0) {
    res = _indice.slice(0, 60);
  } else if (isEndBusca) {
    const qNorm = q.replace(/\s+/g, ' ').trim();
    res = _indice.filter(e => e._end.toLowerCase().replace(/\s+/g,' ').includes(qNorm));
  } else if (q.length === 1) {
    res = _indice.filter(e => e._cod.startsWith(q) || e._desc.startsWith(q)).slice(0, 80);
  } else {
    res = _indice.filter(e => e._cod.includes(q) || e._desc.includes(q));
  }

  if (filtroAtivo === 'picking')
    res = res.filter(e => /\s10$/.test(e._end.trim()));
  else if (filtroAtivo === 'reserva')
    res = res.filter(e => !/\s10$/.test(e._end.trim()));

  const resCount = Object.keys(reservasDB).filter(idx =>
    marcaAtiva === 'ambas' || idx.startsWith(marcaAtiva + '_')
  ).length;

  if (stats) stats.innerHTML =
    '<div class="stat-chip"><i class="bi bi-list-ul"></i><span>' + res.length + '</span><label>' + (isEndBusca ? 'Endereço' : 'Resultados') + '</label></div>' +
    '<div class="stat-chip stock"><i class="bi bi-boxes"></i><span>' + _indice.length + '</span><label>Em estoque</label></div>' +
    '<div class="stat-chip reserved"><i class="bi bi-bookmark-check"></i><span>' + resCount + '</span><label>Reservados</label></div>';

  if (!res.length) {
    lista.innerHTML = q.length > 0
      ? '<div class="empty"><div class="icon"><i class="bi bi-search"></i></div><h3>Nenhum resultado</h3><p>' +
        (isEndBusca ? 'Nenhum produto no endereço "' + q.toUpperCase() + '"' : 'Tente outro código ou descrição') +
        '</p></div>'
      : '<div class="empty"><div class="icon"><i class="bi bi-box-seam"></i></div><h3>Base carregada</h3><p>Digite um código, descrição ou endereço para buscar</p></div>';
    return;
  }

  lista.innerHTML = res.map(e => cardHTMLFast(e)).join('');
}

// ════ RESERVAR / DEVOLVER / BAIXA ════════════════════════════════
function registrarLog(acao, dados) {
  const entry = {
    acao, ts: Date.now(),
    hora: new Date().toLocaleString('pt-BR'),
    nome: usuarioLogado?.nome || '?',
    cracha: usuarioLogado?.cracha || '?',
    ...dados
  };
  db.ref('log').push(entry).catch(() => {});
}

function reservarItem(idx, marca) {
  if (usuarioLogado?.perfil !== 'adm') return;
  if (!_estaOnline) { toast('Sem conexao: nao e possivel reservar offline'); return; }
  const b    = bases[marca];
  const item = b?.dados.find(r => r._idx === idx);
  const info = { nome: usuarioLogado.nome, cracha: usuarioLogado.cracha, hora: new Date().toLocaleString('pt-BR'), marca };
  db.ref('reservas/' + idx).set(info).then(() => {
    toast('Sucesso: produto reservado');
    registrarLog('reserva', {
      marca,
      codigo:    item ? (item[b.mapa.codigo]    ?? '—') : idx,
      descricao: item ? (item[b.mapa.descricao] ?? '—') : '',
      endereco:  item ? (item[b.mapa.endereco]  ?? '')  : '',
    });
  }).catch(e => toast('Erro: ' + e.message));
}

function voltarEstoque(idx) {
  if (usuarioLogado?.perfil !== 'adm') return;
  const marca  = idx.startsWith('batavo') ? 'batavo' : 'itambe';
  const b      = bases[marca];
  const item   = b?.dados.find(r => r._idx === idx);
  db.ref('reservas/' + idx).remove().then(() => {
    toast('Sucesso: devolvido ao estoque');
    registrarLog('devolucao', {
      marca,
      codigo:    item ? (item[b.mapa.codigo]    ?? '—') : idx,
      descricao: item ? (item[b.mapa.descricao] ?? '—') : '',
      endereco:  item ? (item[b.mapa.endereco]  ?? '')  : '',
    });
  }).catch(e => toast('Erro: ' + e.message));
}

function darBaixa(idx, marca) {
  if (usuarioLogado?.perfil === 'guest') return;
  confirmar('Dar baixa?', 'O item será removido do estoque e registrado no histórico.', () => {
    const b = bases[marca];
    if (!b) return;
    const item = b.dados.find(r => r._idx === idx);
    if (!item) return;
    const map  = b.mapa;
    const baixa = {
      codigo:    item[map.codigo]    ?? '—',
      descricao: item[map.descricao] ?? '—',
      endereco:  item[map.endereco]  ?? '—',
      caixas:    item[map.caixas]    ?? '',
      fab:       fmtData(item[map.dtFab]),
      val:       fmtData(item[map.dtVal]),
      hora:      new Date().toLocaleString('pt-BR'),
      ts:        Date.now(),
      marca,
      nome:      usuarioLogado.nome,
      cracha:    usuarioLogado.cracha
    };
    const upd = {};
    upd['reservas/' + idx]  = null;
    upd['baixados/' + idx]  = true;
    upd['baixas/' + db.ref('baixas').push().key] = baixa;
    db.ref().update(upd).then(() => {
      toast('Sucesso: baixa registrada');
      registrarLog('baixa', {
        marca,
        codigo:    baixa.codigo,
        descricao: baixa.descricao,
        endereco:  baixa.endereco,
      });
    }).catch(e => toast('Erro: ' + e.message));
  });
}

// ════ RENDER RESERVADOS ═══════════════════════════════════════════
function renderReservados() {
  const lista = document.getElementById('listaReservados');
  const vazio = document.getElementById('vazioReservados');
  if (!lista) return;

  const marcas = marcaAtiva === 'ambas' ? ['batavo','itambe'] : [marcaAtiva];
  const items  = [];

  Object.entries(reservasDB).forEach(([idx, resInfo]) => {
    const marca = idx.startsWith('batavo') ? 'batavo' : 'itambe';
    if (!marcas.includes(marca)) return;
    if (baixadosDB[idx]) return;
    const b = bases[marca];
    if (!b.carregada) return;
    const item = b.dados.find(r => r._idx === idx);
    if (!item) return;
    items.push({ item, marca, resInfo, idx });
  });

  if (!items.length) {
    lista.innerHTML = '';
    if (vazio) vazio.style.display = '';
    return;
  }
  if (vazio) vazio.style.display = 'none';

  lista.innerHTML = items.map(({ item, marca, resInfo, idx }) => {
    const h   = escapeHtml;
    const map = bases[marca].mapa;
    const cc  = marca === 'itambe' ? 'var(--itm)' : 'var(--bat)';
    const bl  = marca === 'batavo' ? 'BATAVO' : 'ITAMBÉ';
    const cod = item[map.codigo]    ?? '—';
    const dsc = item[map.descricao] ?? '—';
    const cx  = item[map.caixas]    ?? '';
    const fab = fmtData(item[map.dtFab]);
    const val = fmtData(item[map.dtVal]);
    const end = item[map.endereco]  ?? '';
    let meta = [];
    if (cx)         meta.push('<span class="cx"><i class="bi bi-box-seam"></i> <b>' + h(cx) + '</b> cx</span>');
    if (end)        meta.push('<span class="end"><i class="bi bi-geo-alt"></i> ' + h(end) + '</span>');
    if (fab !== '—') meta.push('<span>Fab <b>' + h(fab) + '</b></span>');
    if (val !== '—') meta.push('<span>Val <b>' + h(val) + '</b></span>');
    return '<div class="card">' +
      '<div class="card-head"><div>' +
        '<div class="card-code" style="color:' + cc + '">' + h(cod) + '</div>' +
        '<div class="card-desc">' + h(dsc) + '</div>' +
      '</div><div class="head-right"><span class="card-brand" style="color:' + cc + '">' + bl + '</span></div></div>' +
      (meta.length ? '<div class="card-meta">' + meta.join('') + '</div>' : '') +
      '<div class="res-info"><i class="bi bi-person"></i> <b>' + h(resInfo.nome) + '</b> · ' + h(resInfo.hora) + '</div>' +
      '<div class="card-actions">' +
        '<div class="card-actions-right">' +
          '<button class="btn btn-voltar" onclick="voltarEstoque(\'' + idx + '\')"><i class="bi bi-arrow-counterclockwise"></i> Devolver</button>' +
          '<button class="btn btn-baixa" onclick="darBaixa(\'' + idx + '\',\'' + marca + '\')"><i class="bi bi-check2-circle"></i> Dar Baixa</button>' +
        '</div>' +
      '</div></div>';
  }).join('');
}

// ════ RENDER BAIXAS ═══════════════════════════════════════════════
function renderBaixas() {
  const lista = document.getElementById('listaBaixas');
  const vazio = document.getElementById('vazioBaixas');
  if (!lista) return;
  const q = document.getElementById('searchBaixas')?.value.trim().toLowerCase() ?? '';
  const isAdm = usuarioLogado && usuarioLogado.perfil === 'adm';

  let items = baixasDB;
  if (marcaAtiva !== 'ambas') items = items.filter(b => b.marca === marcaAtiva);
  if (!isAdm) items = items.filter(b => b.cracha === usuarioLogado?.cracha);
  if (q) items = items.filter(b =>
    String(b.codigo||'').toLowerCase().includes(q) ||
    String(b.descricao||'').toLowerCase().includes(q)
  );

  if (!items.length) {
    lista.innerHTML = '';
    if (vazio) vazio.style.display = '';
    return;
  }
  if (vazio) vazio.style.display = 'none';

  lista.innerHTML = items.map(b => {
    const h  = escapeHtml;
    const cc = b.marca === 'itambe' ? 'var(--itm)' : 'var(--bat)';
    const bl = b.marca === 'batavo' ? 'BATAVO' : 'ITAMBÉ';
    let meta = [];
    if (b.caixas)              meta.push('<span class="cx"><i class="bi bi-box-seam"></i> <b>' + h(b.caixas) + '</b> cx</span>');
    if (b.endereco)            meta.push('<span class="end"><i class="bi bi-geo-alt"></i> ' + h(b.endereco) + '</span>');
    if (b.fab && b.fab !== '—') meta.push('<span>Fab <b>' + h(b.fab) + '</b></span>');
    if (b.val && b.val !== '—') meta.push('<span>Val <b>' + h(b.val) + '</b></span>');
    return '<div class="card">' +
      '<div class="card-head"><div>' +
        '<div class="card-code" style="color:' + cc + '">' + h(b.codigo||'—') + '</div>' +
        '<div class="card-desc">' + h(b.descricao||'—') + '</div>' +
      '</div><div class="head-right"><span class="card-brand" style="color:' + cc + '">' + bl + '</span></div></div>' +
      (meta.length ? '<div class="card-meta">' + meta.join('') + '</div>' : '') +
      '<div class="baixa-user-row"><span><i class="bi bi-person"></i> <b>' + h(b.nome) + '</b> · ' + h(b.cracha) + '</span><span>' + h(b.hora) + '</span></div>' +
    '</div>';
  }).join('');
}

function limparBaixas() {
  confirmar('Limpar histórico de baixas?', 'Todas as baixas registradas serão removidas permanentemente.', () => {
    db.ref('baixas').remove().then(() => toast('Histórico de baixas limpo'));
  });
}

function limparTudo() {
  confirmar(
    '⚠️ Resetar o dia completo?',
    'Isso remove as duas bases, todas as reservas e todo o histórico de baixas do servidor para todos os usuários. Esta ação não pode ser desfeita.',
    () => {
      db.ref().update({
        'bases/batavo':  { carregada: false },
        'bases/itambe':  { carregada: false },
        'reservas':      null,
        'baixados':      null,
        'baixas':        null,
        'log':           null,
        'contagens':     null,
        'loginAttempts': null,
        'divergencias':  null,
        'bloqueios':     null,
      }).then(() => {
        try { localStorage.removeItem(CACHE_KEY); } catch(e) {}
        toast('Sucesso: dia resetado');
      }).catch(e => toast('Erro: ' + e.message));
    }
  );
}

// ════ ADMIN ═══════════════════════════════════════════════════════
function cadastrarUsuario() {
  const nome   = document.getElementById('novoNome').value.trim();
  const cracha = document.getElementById('novoCracha').value.trim();
  const base   = document.getElementById('novaBase').value;
  if (!nome || !cracha) { toast('Preencha nome e cracha'); return; }
  if (cracha === ADM_CRACHA) { toast('Este cracha e reservado'); return; }
  db.ref('usuarios/' + cracha).set({ nome, cracha, basePerm: base })
    .then(() => {
      document.getElementById('novoNome').value = '';
      document.getElementById('novoCracha').value = '';
      toast('Sucesso: usuario cadastrado');
    }).catch(e => toast('Erro: ' + e.message));
}

function removerUsuario(cracha) {
  confirmar('Remover usuário?', 'O crachá ' + cracha + ' perderá o acesso ao app.', () => {
    db.ref('usuarios/' + cracha).remove()
      .then(() => toast('Sucesso: usuario removido'))
      .catch(e => toast('Erro: ' + e.message));
  });
}

function renderUsuarios() {
  const lista = document.getElementById('listaUsuarios');
  if (!lista) return;
  const users = Object.values(usuariosDB);
  if (!users.length) {
    lista.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0">Nenhum usuário cadastrado</div>';
    return;
  }
  const baseLabel = { batavo:'Batavo', itambe:'Itambe', ambas:'Ambas' };
  const perms = ['batavo','itambe','ambas'];
  lista.innerHTML = users.map(u =>
    '<div class="usuario-card" style="flex-wrap:wrap;gap:8px">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="usuario-nome">' + u.nome + '</div>' +
        '<div class="usuario-meta">Crachá: ' + u.cracha + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">' +
        perms.map(p =>
          '<button onclick="alterarPermissao(\'' + u.cracha + '\',\'' + p + '\')" ' +
          'style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;cursor:pointer;font-family:\'IBM Plex Sans\',sans-serif;border:1.5px solid;transition:all .15s;' +
          (u.basePerm === p
            ? (p==='batavo' ? 'background:var(--bat-bg);border-color:var(--bat);color:var(--bat)'
              : p==='itambe' ? 'background:var(--itm-bg);border-color:var(--itm);color:var(--itm)'
              : 'background:var(--accent-light);border-color:var(--accent);color:var(--accent)')
            : 'background:transparent;border-color:var(--border);color:var(--muted)') +
          '">' +
          (p==='batavo'?'Batavo':p==='itambe'?'Itambe':'Ambas') +
          '</button>'
        ).join('') +
        '<button class="btn-remover" onclick="removerUsuario(\'' + u.cracha + '\')">✕</button>' +
      '</div>' +
    '</div>'
  ).join('');
}

function alterarPermissao(cracha, novaPerm) {
  db.ref('usuarios/' + cracha + '/basePerm').set(novaPerm)
    .then(() => {
      const label = { batavo:'Batavo', itambe:'Itambe', ambas:'Ambas' };
      toast('Sucesso: permissao alterada para ' + label[novaPerm]);
    })
    .catch(e => toast('Erro: ' + e.message));
}

function renderResumoBaixas() {
  const el = document.getElementById('resumoBaixas');
  if (!el) return;
  if (!baixasDB.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--muted)">Nenhuma baixa registrada</p>';
    return;
  }
  const porUsuario = {};
  baixasDB.forEach(b => {
    const key = b.nome + ' (' + b.cracha + ')';
    if (!porUsuario[key]) porUsuario[key] = 0;
    porUsuario[key]++;
  });
  el.innerHTML = Object.entries(porUsuario).map(([user, count]) =>
    '<div class="baixa-stat-card">' +
      '<span style="font-size:13px;font-weight:600"><i class="bi bi-person"></i> ' + user + '</span>' +
      '<span class="tag destaque" style="font-size:12px"><b>' + count + '</b> baixas</span>' +
    '</div>'
  ).join('');
}

// ════ LOG DE ATIVIDADE ════════════════════════════════════════════
function setFiltroLog(f) {
  _filtroLog = f;
  ['Todos','Reserva','Baixa','Divergencia','Base'].forEach(n => {
    document.getElementById('logFiltro' + n)?.classList.toggle('active', f === n.toLowerCase());
  });
  renderLog();
}

function setFiltroLogMarca(m) {
  _filtroLogMarca = m;
  ['Todas','Batavo','Itambe'].forEach(n => {
    document.getElementById('logMarca' + n)?.classList.toggle('active', m === n.toLowerCase());
  });
  renderLog();
}

function setFiltroLogUsuario(u) {
  _filtroLogUsuario = u;
  renderLog();
}

function setFiltroLogBusca(q) {
  _filtroLogBusca = q.toLowerCase().trim();
  renderLog();
}

function atualizarBadgeLog() {
  const el = document.getElementById('badgeLog');
  if (!el) return;
  const isAdm = usuarioLogado?.perfil === 'adm';
  const count = isAdm ? logDB.length
    : logDB.filter(e => e.cracha === usuarioLogado?.cracha).length;
  el.textContent = count > 0 ? ' (' + count + ')' : '';
}

function renderLog() {
  const lista = document.getElementById('listaLog');
  const vazio = document.getElementById('vazioLog');
  if (!lista) return;
  const isAdm = usuarioLogado?.perfil === 'adm';

  // Mostra/oculta filtros exclusivos do ADM
  const admFiltros = document.getElementById('logFiltrosAdm');
  if (admFiltros) admFiltros.style.display = isAdm ? '' : 'none';

  // Popula dropdown de usuários (só uma vez)
  if (isAdm) {
    const sel = document.getElementById('logFiltroUsuario');
    if (sel && sel.options.length <= 1) {
      const todos = { ...usuariosDB };
      todos[ADM_CRACHA] = { nome: ADM_NOME, cracha: ADM_CRACHA };
      Object.values(todos).sort((a,b) => a.nome.localeCompare(b.nome)).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.cracha;
        opt.textContent = u.nome + ' (' + u.cracha + ')';
        sel.appendChild(opt);
      });
    }
  }

  let items = isAdm ? logDB
    : logDB.filter(e => e.cracha === usuarioLogado?.cracha);

  if (_filtroLog !== 'todos')
    items = items.filter(e => e.acao === _filtroLog);

  if (isAdm && _filtroLogMarca !== 'todas')
    items = items.filter(e => e.marca === _filtroLogMarca);

  if (isAdm && _filtroLogUsuario !== 'todos')
    items = items.filter(e => e.cracha === _filtroLogUsuario);

  if (_filtroLogBusca) {
    const q = _filtroLogBusca;
    items = items.filter(e =>
      (e.codigo    || '').toLowerCase().includes(q) ||
      (e.descricao || '').toLowerCase().includes(q) ||
      (e.nome      || '').toLowerCase().includes(q) ||
      (e.endereco  || '').toLowerCase().includes(q) ||
      (e.arquivo   || '').toLowerCase().includes(q)
    );
  }

  if (!items.length) {
    lista.innerHTML = '';
    if (vazio) vazio.style.display = '';
    return;
  }
  if (vazio) vazio.style.display = 'none';

  const acaoConfig = {
    reserva:     { icon:'<i class="bi bi-bookmark-check"></i>',       label:'Reservou',       cls:'reserva' },
    baixa:       { icon:'<i class="bi bi-check2-circle"></i>',         label:'Deu baixa em',   cls:'baixa' },
    devolucao:   { icon:'<i class="bi bi-arrow-counterclockwise"></i>',label:'Devolveu',      cls:'devolucao' },
    base:        { icon:'<i class="bi bi-database"></i>',              label:'Carregou base',  cls:'base' },
    divergencia: { icon:'<i class="bi bi-exclamation-triangle"></i>',  label:'Divergencia em', cls:'devolucao' },
    bloqueio:    { icon:'<i class="bi bi-lock"></i>',                  label:'Bloqueou',       cls:'baixa' },
    desbloqueio: { icon:'<i class="bi bi-unlock"></i>',                label:'Desbloqueou',    cls:'reserva' },
  };

  lista.innerHTML = '<div class="timeline">' + items.map((e, i) => {
    const cfg   = acaoConfig[e.acao] || { icon:'<i class="bi bi-dot"></i>', label:e.acao, cls:'base' };
    const marca = e.marca || '';
    const hasLine = i < items.length - 1;
    let detalhe = '';
    if (e.acao === 'base') {
      detalhe = '<div class="tl-acao">' + cfg.label + ' ' + (marca === 'batavo' ? 'Batavo' : 'Itambe') + ' (' + (e.total||'?') + ' registros)</div>' +
        '<div class="tl-cod">' + (e.arquivo||'') + '</div>';
    } else {
      detalhe = '<div class="tl-acao">' + cfg.label + ' <span style="font-family:\'IBM Plex Mono\',monospace">' + (e.codigo||'') + '</span></div>' +
        (e.descricao ? '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">' + e.descricao + '</div>' : '') +
        (e.endereco  ? '<div style="font-size:11px;color:var(--muted)"><i class="bi bi-geo-alt"></i> ' + e.endereco + '</div>' : '');
    }
    return '<div class="tl-item">' +
      '<div class="tl-dot-wrap">' +
        '<div class="tl-dot ' + cfg.cls + '">' + cfg.icon + '</div>' +
        (hasLine ? '<div class="tl-line"></div>' : '') +
      '</div>' +
      '<div class="tl-body">' +
        detalhe +
        '<div class="tl-meta">' +
          '<span><i class="bi bi-person"></i> ' + e.nome + '</span>' +
          (marca ? '<span class="tl-marca ' + marca + '">' + (marca === 'batavo' ? 'BATAVO' : 'ITAMBE') + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="tl-hora">' + (e.hora||'') + '</div>' +
    '</div>';
  }).join('') + '</div>';
}
function setFiltroVenc(dias) {
  _filtroVencDias = dias;
  _filtroVencCustom = false;
  [2,5,10,30].forEach(d => document.getElementById('fv'+d)?.classList.toggle('active', d===dias));
  document.getElementById('fvCustom')?.classList.remove('active');
  const wrap = document.getElementById('filtroCustomWrap');
  if (wrap) wrap.style.display = 'none';
  renderVencimentos();
}

function toggleFiltroCustom() {
  _filtroVencCustom = !_filtroVencCustom;
  [2,5,10,30].forEach(d => document.getElementById('fv'+d)?.classList.remove('active'));
  document.getElementById('fvCustom')?.classList.toggle('active', _filtroVencCustom);
  const wrap = document.getElementById('filtroCustomWrap');
  if (wrap) wrap.style.display = _filtroVencCustom ? '' : 'none';
  if (_filtroVencCustom) renderVencimentos();
}

function renderVencimentos() {
  const lista = document.getElementById('listaVencimentos');
  const vazio = document.getElementById('vazioVenc');
  const stats = document.getElementById('statsVenc');
  if (!lista) return;

  let minDias, maxDias;
  if (_filtroVencCustom) {
    minDias = parseInt(document.getElementById('vencMin')?.value ?? 0);
    maxDias = parseInt(document.getElementById('vencMax')?.value ?? 30);
    if (isNaN(minDias)) minDias = 0;
    if (isNaN(maxDias)) maxDias = 30;
  } else {
    minDias = -9999;
    maxDias = _filtroVencDias;
  }

  const res = _indice
    .filter(e => e._diasVal !== null && e._diasVal >= minDias && e._diasVal <= maxDias)
    .sort((a,b) => a._diasVal - b._diasVal);

  const vencidos = res.filter(e => e._diasVal < 0).length;
  const hoje0    = res.filter(e => e._diasVal === 0).length;
  const proximos = res.filter(e => e._diasVal > 0).length;

  const rangeLabel = _filtroVencCustom
    ? ' · ' + minDias + ' a ' + maxDias + ' dias'
    : '';

  if (stats) stats.innerHTML = res.length
    ? '<div class="stat">Total: <b>' + res.length + '</b>' + rangeLabel + '</div>' +
      (vencidos ? '<div class="stat stat-danger">Vencidos: <b>' + vencidos + '</b></div>' : '') +
      (hoje0    ? '<div class="stat stat-warn">Hoje: <b>' + hoje0 + '</b></div>' : '') +
      '<div class="stat">Próximos: <b>' + proximos + '</b></div>' : '';

  if (!res.length) {
    lista.innerHTML = '';
    if (vazio) vazio.style.display = '';
    return;
  }
  if (vazio) vazio.style.display = 'none';

  lista.innerHTML = res.map(e => {
    const h      = escapeHtml;
    const marca  = e._marca;
    const cc     = marca === 'itambe' ? 'var(--itm)' : 'var(--bat)';
    const bl     = marca === 'batavo' ? 'BATAVO' : 'ITAMBÉ';
    const { valClass, valBadge } = getValStatus(e._diasVal);
    const diasTxt = e._diasVal < 0
      ? 'Vencido há ' + Math.abs(e._diasVal) + ' dia(s)'
      : e._diasVal === 0 ? 'Vence HOJE'
      : 'Vence em ' + e._diasVal + ' dia(s)';
    let meta = [];
    if (e.cx)          meta.push('<span class="cx"><i class="bi bi-box-seam"></i> <b>' + h(e.cx) + '</b> cx</span>');
    if (e.end)         meta.push('<span class="end"><i class="bi bi-geo-alt"></i> ' + h(e.end) + '</span>');
    if (e.fab !== '—') meta.push('<span>Fab <b>' + h(e.fab) + '</b></span>');
    if (e.val !== '—') meta.push('<span>Val <b>' + h(e.val) + '</b></span>');
    return '<div class="card ' + valClass + '">' +
      '<div class="card-head"><div>' +
        '<div class="card-code" style="color:' + cc + '">' + h(e.cod) + '</div>' +
        '<div class="card-desc">' + h(e.desc) + '</div>' +
      '</div><div class="head-right">' +
        '<span class="card-brand" style="color:' + cc + '">' + bl + '</span>' +
        (valBadge ? '<span class="val-badge ' + valClass + '">' + valBadge + '</span>' : '') +
      '</div></div>' +
      (meta.length ? '<div class="card-meta">' + meta.join('') + '</div>' : '') +
      '<div class="card-meta" style="padding-top:0"><span class="urg ' + valClass + '">' + diasTxt + '</span></div>' +
    '</div>';
  }).join('');
}

// ════ CARD FAST ════════════════════════════════════════════════════
function getValStatus(dias, apenasUrgente = false) {
  if (dias === null) return { valClass:'', valBadge:'', valTagClass:'' };
  if (dias < 0)   return { valClass:'vencido', valBadge:'VENCIDO',    valTagClass:'tag-vencido' };
  if (dias === 0) return { valClass:'vencido', valBadge:'VENCE HOJE', valTagClass:'tag-vencido' };
  if (dias === 1) return { valClass:'critico', valBadge:'VENCE AMANHA', valTagClass:'tag-critico' };
  // Abaixo: só mostra se NÃO for modo urgente (aba Vencimentos)
  if (apenasUrgente) return { valClass:'', valBadge:'', valTagClass:'' };
  if (dias <= 7)  return { valClass:'critico', valBadge:dias+'d',  valTagClass:'tag-critico' };
  if (dias <= 30) return { valClass:'atencao', valBadge:dias+'d',  valTagClass:'tag-atencao' };
  return { valClass:'', valBadge:'', valTagClass:'' };
}

function cardHTMLFast(e) {
  const h           = escapeHtml; // alias para sanitização de dados externos
  const marca       = e._marca;
  const idx         = e._ref._idx;
  const isPicking   = /\s10$/.test(e._end.trim());
  const isBloqueado = !!e._bloqueio;
  const cc  = marca === 'itambe' ? 'var(--itm)' : 'var(--bat)';
  const bl  = marca === 'batavo' ? 'BATAVO' : 'ITAMBÉ';
  const { valClass, valBadge, valTagClass } = getValStatus(e._diasVal, true);

  let metaItems = [];
  if (e.cx)          metaItems.push('<span class="cx"><i class="bi bi-box-seam"></i> <b>' + h(e.cx) + '</b> cx</span>');
  if (e.end)         metaItems.push('<span class="end"><i class="bi bi-geo-alt"></i> ' + h(e.end) + '</span>');
  if (e.fab !== '—') metaItems.push('<span>Fab <b>' + h(e.fab) + '</b></span>');
  if (e.val !== '—') {
    const urgCls = valTagClass ? 'urg ' + valClass : '';
    metaItems.push('<span class="' + urgCls + '">Val <b>' + h(e.val) + '</b>' + (valBadge ? '  ' + valBadge : '') + '</span>');
  }

  const placaBloqueio = isBloqueado
    ? '<div class="card-bloqueado-placa">' +
        '<div class="card-bloqueado-placa-icon"><i class="bi bi-slash-circle"></i></div>' +
        '<div class="card-bloqueado-placa-info">' +
          '<div class="card-bloqueado-placa-titulo">Bloqueado</div>' +
          '<div class="card-bloqueado-placa-detalhe">' +
            h(e._bloqueio.motivo || '') + ' · ' +
            h(e._bloqueio.nome   || '') + ' · ' +
            h(e._bloqueio.hora   || '') +
          '</div>' +
        '</div>' +
      '</div>'
    : '';

  let acoesEsq = '';
  if (isPicking && !isBloqueado) {
    acoesEsq = '<span class="picking-label">PICKING</span>';
  }

  let acoesDireita = '';
  if (isBloqueado) {
    acoesDireita =
      '<button class="btn-card desbloquear" onclick="desbloquearItem(\'' + idx + '\')"><i class="bi bi-unlock"></i> Desbloquear</button>' +
      '<button class="btn-card" onclick="abrirDivergencia(\'' + idx + '\',\'' + marca + '\')"><span style="color:var(--ora)"><i class="bi bi-exclamation-triangle"></i></span> Diverg.</button>';
  } else if (isPicking) {
    acoesDireita =
      '<button class="btn-card" onclick="darBaixaPicking(\'' + idx + '\',\'' + marca + '\')"><span style="color:var(--red)"><i class="bi bi-check2-circle"></i></span> Baixa</button>' +
      '<button class="btn-card" onclick="abrirDivergencia(\'' + idx + '\',\'' + marca + '\')"><span style="color:var(--ora)"><i class="bi bi-exclamation-triangle"></i></span> Diverg.</button>';
  } else {
    acoesDireita =
      '<button class="btn-card reservar" onclick="reservarItem(\'' + idx + '\',\'' + marca + '\')">Reservar</button>' +
      '<button class="btn-card" onclick="abrirDivergencia(\'' + idx + '\',\'' + marca + '\')"><span style="color:var(--ora)"><i class="bi bi-exclamation-triangle"></i></span> Diverg.</button>';
  }

  // Define ações por perfil
  const isAdm   = usuarioLogado?.perfil === 'adm';
  const isGuest = usuarioLogado?.perfil === 'guest';
  let acoesHTML = '';
  if (isAdm) {
    acoesHTML = '<div class="card-actions">' + acoesEsq + '<div class="card-actions-right">' + acoesDireita + '</div></div>';
  } else if (!isGuest && !isBloqueado) {
    // Operador: label PICKING (se aplicável) + apenas botão Baixa
    acoesHTML = '<div class="card-actions">' +
      acoesEsq +
      '<div class="card-actions-right">' +
        '<button class="btn-card btn-baixa" onclick="darBaixa(\'' + idx + '\',\'' + marca + '\')"><span style="color:var(--itm)"><i class="bi bi-check2-circle"></i></span> Baixa</button>' +
      '</div>' +
    '</div>';
  } else if (!isGuest && isBloqueado) {
    // Operador com item bloqueado: só label PICKING se aplicável
    acoesHTML = acoesEsq ? '<div class="card-actions">' + acoesEsq + '</div>' : '';
  }
  // Guest: acoesHTML permanece '' — sem nenhum botão

  return '<div class="card ' + marca + ' ' + valClass + (isBloqueado ? ' bloqueado' : '') + '">' +
    '<div class="card-head">' +
      '<div>' +
        '<div class="card-code" style="color:' + cc + '">' + h(e.cod) + '</div>' +
        '<div class="card-desc">' + h(e.desc) + '</div>' +
      '</div>' +
      '<div class="head-right">' +
        '<span class="card-brand" style="color:' + cc + '">' + bl + '</span>' +
      '</div>' +
    '</div>' +
    (metaItems.length ? '<div class="card-meta">' + metaItems.join('') + '</div>' : '') +
    placaBloqueio +
    acoesHTML +
  '</div>';
}

// ════ DATAS ════════════════════════════════════════════════════════
function parseData(v) {
  if (!v) return Infinity;
  if (v instanceof Date) return isNaN(v) ? Infinity : Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === 'string') {
    const m4 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m4) return Date.UTC(+m4[3], +m4[2]-1, +m4[1]);
    const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (m2) return Date.UTC(2000 + +m2[3], +m2[2]-1, +m2[1]);
  }
  const t = new Date(v).getTime();
  return isNaN(t) ? Infinity : t;
}

function fmtData(v) {
  if (!v) return '—';
  if (v instanceof Date) {
    if (isNaN(v)) return '—';
    return pad(v.getDate()) + '/' + pad(v.getMonth()+1) + '/' + v.getFullYear();
  }
  if (typeof v === 'string') {
    const m4 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m4) return pad(+m4[1]) + '/' + pad(+m4[2]) + '/' + m4[3];
    const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (m2) return pad(+m2[1]) + '/' + pad(+m2[2]) + '/20' + m2[3];
  }
  const d = new Date(v);
  return isNaN(d) ? String(v) : pad(d.getDate()) + '/' + pad(d.getMonth()+1) + '/' + d.getFullYear();
}
function pad(n) { return String(n).padStart(2,'0'); }

// ════ MODAIS ══════════════════════════════════════════════════════
let _confirmCb = null;
function confirmar(titulo, msg, cb) {
  _confirmCb = cb;
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalMsg').textContent    = msg;
  document.getElementById('modal').classList.add('show');
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalOk').onclick = () => { fecharModal(); if (_confirmCb) _confirmCb(); };
});
function fecharModal() { document.getElementById('modal').classList.remove('show'); }

// ════ CACHE OFFLINE ═══════════════════════════════════════════════
const CACHE_KEY = 'estoque-cache-v1';

function salvarCache() {
  try {
    const payload = {
      ts: Date.now(),
      batavo: bases.batavo.carregada ? {
        dados: bases.batavo.dados,
        mapa:  bases.batavo.mapa,
        arquivo: bases.batavo.arquivo,
        carregadoPor: bases.batavo.carregadoPor
      } : null,
      itambe: bases.itambe.carregada ? {
        dados: bases.itambe.dados,
        mapa:  bases.itambe.mapa,
        arquivo: bases.itambe.arquivo,
        carregadoPor: bases.itambe.carregadoPor
      } : null,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch(e) { /* sem espaço */ }
}

function restaurarCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    const idadeH  = (Date.now() - (payload.ts||0)) / 3600000;
    if (idadeH > 24) return false; // cache expirado
    let restaurou = false;
    ['batavo','itambe'].forEach(m => {
      if (payload[m] && !bases[m].carregada) {
        const d = Array.isArray(payload[m].dados) ? payload[m].dados : Object.values(payload[m].dados||{});
        bases[m] = { dados: d, mapa: payload[m].mapa, carregada: true,
          arquivo: payload[m].arquivo + ' (cache)', carregadoPor: payload[m].carregadoPor, carregadoEm: null };
        restaurou = true;
      }
    });
    return restaurou;
  } catch(e) { return false; }
}
// null = ainda não carregada do Firebase; nunca inicializar com valor hardcoded
let _senhaAdm = null;

function carregarSenhaAdm() {
  db.ref('config/senhaAdm').get().then(snap => {
    // String() garante comparação correta mesmo se Firebase salvar como número
    if (snap.exists()) _senhaAdm = String(snap.val());
  }).catch(() => {
    // Falha de rede: _senhaAdm permanece null — login ADM indisponível offline
  });
}

function alterarSenha() {
  const atual    = document.getElementById('senhaAtual').value;
  const nova     = document.getElementById('senhaNova').value.trim();
  const confirm  = document.getElementById('senhaConfirm').value.trim();

  if (atual !== _senhaAdm) { toast('Senha atual incorreta'); return; }
  if (!nova) { toast('Digite a nova senha'); return; }
  if (nova.length < 6) { toast('Senha precisa ter pelo menos 6 caracteres'); return; }
  if (nova !== confirm) { toast('As senhas nao conferem'); return; }

  db.ref('config/senhaAdm').set(nova).then(() => {
    _senhaAdm = nova;
    document.getElementById('senhaAtual').value  = '';
    document.getElementById('senhaNova').value   = '';
    document.getElementById('senhaConfirm').value = '';
    toast('Sucesso: senha alterada');
  }).catch(e => toast('Erro: ' + e.message));
}
const TEMAS = ['','t-claro','t-industrial','t-oceano','t-roxo'];
function aplicarTema(tema) {
  TEMAS.forEach(t => { if (t) document.body.classList.remove(t); });
  if (tema) document.body.classList.add(tema);
  TEMAS.forEach(t => {
    const el = document.getElementById('check-' + t);
    if (el) el.textContent = t === tema ? '✓' : '';
  });
  document.querySelectorAll('.tema-btn').forEach(b => b.classList.toggle('ativo', b.dataset.tema === tema));
  fecharTemas();
  try { localStorage.setItem('estoque-tema', tema); } catch(e) {}
}
function abrirTemas()  { document.getElementById('modalTemas')?.classList.add('show'); }
function fecharTemas() { document.getElementById('modalTemas')?.classList.remove('show'); }

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ════ CONTAGEM PARCIAL ════════════════════════════════════════════
let _contagemIdx = null, _contagemMarca = null;

function abrirContagem(idx, marca) {
  const b    = bases[marca];
  const item = b?.dados.find(r => r._idx === idx);
  if (!item) return;
  _contagemIdx   = idx;
  _contagemMarca = marca;

  const cxSistema = item[b.mapa.caixas] ?? '—';
  const cod  = item[b.mapa.codigo]    ?? '—';
  const desc = item[b.mapa.descricao] ?? '—';
  const contagemAnterior = contagensDB[idx];

  document.getElementById('modalContagemTitulo').textContent = String(cod);
  document.getElementById('modalContagemDesc').textContent = String(desc);
  document.getElementById('modalContagemSistema').textContent = String(cxSistema) + ' cx';
  const inp = document.getElementById('modalContagemReal');
  inp.value = contagemAnterior ? contagemAnterior.real : '';
  document.getElementById('modalContagemDiff').innerHTML = '';
  document.getElementById('modalContagem').classList.add('show');
  setTimeout(() => inp.focus(), 120);
  inp.oninput = () => {
    const real   = parseInt(inp.value);
    const sis    = parseInt(cxSistema);
    const diffEl = document.getElementById('modalContagemDiff');
    if (!isNaN(real) && !isNaN(sis)) {
      const diff = real - sis;
      const cor  = diff === 0 ? 'var(--accent)' : diff > 0 ? 'var(--yel)' : 'var(--red)';
      const sinal = diff > 0 ? '+' : '';
      diffEl.innerHTML = '<span style="color:' + cor + ';font-weight:700;font-size:15px">' +
        (diff === 0 ? 'Confere' : sinal + diff + ' caixas em relacao ao sistema') + '</span>';
    } else { diffEl.innerHTML = ''; }
  };
}

function fecharModalContagem() {
  document.getElementById('modalContagem').classList.remove('show');
  _contagemIdx = _contagemMarca = null;
}

function confirmarContagem() {
  const inp  = document.getElementById('modalContagemReal');
  const real = parseInt(inp.value);
  if (isNaN(real) || real < 0) { toast('Digite uma quantidade valida'); return; }

  const b    = bases[_contagemMarca];
  const item = b?.dados.find(r => r._idx === _contagemIdx);
  const sis  = parseInt(item ? (item[b.mapa.caixas] ?? 0) : 0);

  const entry = {
    real, sistema: sis, diff: real - sis,
    nome:   usuarioLogado.nome,
    cracha: usuarioLogado.cracha,
    hora:   new Date().toLocaleString('pt-BR'),
    ts:     Date.now(),
    codigo: item ? (item[b.mapa.codigo] ?? '—') : '—',
    marca:  _contagemMarca,
  };

  db.ref('contagens/' + _contagemIdx).set(entry)
    .then(() => {
      toast('Sucesso: contagem salva - ' + (entry.diff === 0 ? 'Confere!' : (entry.diff > 0 ? '+' : '') + entry.diff + ' cx'));
      fecharModalContagem();
    })
    .catch(e => toast('Erro: ' + e.message));
}

// ════ LOGIN ATTEMPTS ══════════════════════════════════════════════
function renderLoginAttempts() {
  const el = document.getElementById('listaLoginAttempts');
  if (!el) return;
  if (!loginAttemptsDB.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--muted)">Nenhuma tentativa registrada</p>';
    return;
  }
  el.innerHTML = loginAttemptsDB.slice(0, 20).map(a =>
    '<div class="attempt-item">' +
      '<span>Crachá <span class="attempt-cracha">' + escapeHtml(String(a.cracha)) + '</span></span>' +
      '<span class="attempt-hora">' + (a.hora || '') + '</span>' +
    '</div>'
  ).join('');
}

function limparLoginAttempts() {
  confirmar('Limpar tentativas?', 'Remove o log de tentativas de login inválidas.', () => {
    db.ref('loginAttempts').remove().then(() => toast('Sucesso: log limpo')).catch(e => toast('Erro: ' + e.message));
  });
}

// ════ PICKING — DAR BAIXA DIRETO ════════════════════════════════
function darBaixaPicking(idx, marca) {
  if (usuarioLogado?.perfil !== 'adm') return;
  confirmar('Dar baixa no picking?', 'O item será removido do estoque definitivamente.', () => {
    const b    = bases[marca];
    const item = b?.dados.find(r => r._idx === idx);
    if (!item) return;
    const map  = b.mapa;
    const baixa = {
      codigo:    item[map.codigo]    ?? '—',
      descricao: item[map.descricao] ?? '—',
      endereco:  item[map.endereco]  ?? '—',
      caixas:    item[map.caixas]    ?? '',
      fab:       fmtData(item[map.dtFab]),
      val:       fmtData(item[map.dtVal]),
      hora:      new Date().toLocaleString('pt-BR'),
      ts:        Date.now(),
      marca,
      nome:      usuarioLogado.nome,
      cracha:    usuarioLogado.cracha,
      origem:    'picking'
    };
    const upd = {};
    upd['baixados/' + idx] = true;
    upd['baixas/'   + db.ref('baixas').push().key] = baixa;
    db.ref().update(upd).then(() => {
      toast('Sucesso: baixa de picking registrada');
      registrarLog('baixa', { marca, codigo: baixa.codigo, descricao: baixa.descricao, endereco: baixa.endereco });
    }).catch(e => toast('Erro: ' + e.message));
  });
}

// ════ BLOQUEIO DE PALETE ════════════════════════════════════════
function toggleBloquearSec() {
  const checked = document.getElementById('divBloquearCheck').checked;
  document.getElementById('divBloquearMotivo').style.display = checked ? '' : 'none';
  // Auto-seleciona o motivo baseado na divergência escolhida
  if (checked) {
    const motivoDiv = _divergMotivo;
    const sel = document.getElementById('divMotivoBloquear');
    if (motivoDiv === 'etiqueta') sel.value = 'Divergência de estoque';
    else if (motivoDiv === 'qtd' || motivoDiv === 'ambos') sel.value = 'Divergência de estoque';
    else if (motivoDiv === 'data') sel.value = 'Divergência de estoque';
  }
}

function bloquearItem(idx, motivo) {
  if (usuarioLogado?.perfil !== 'adm') return;
  const entry = {
    motivo,
    nome:   usuarioLogado.nome,
    cracha: usuarioLogado.cracha,
    hora:   new Date().toLocaleString('pt-BR'),
    ts:     Date.now()
  };
  db.ref('bloqueios/' + idx).set(entry).then(() => {
    registrarLog('bloqueio', {
      marca:   idx.startsWith('batavo') ? 'batavo' : 'itambe',
      idx,
      motivo
    });
  }).catch(e => toast('Erro ao bloquear: ' + e.message));
}

function desbloquearItem(idx) {
  if (usuarioLogado?.perfil !== 'adm') return;
  confirmar('Desbloquear palete?', 'O produto voltará a ficar disponível para reserva.', () => {
    db.ref('bloqueios/' + idx).remove().then(() => {
      toast('Sucesso: palete desbloqueado');
      registrarLog('desbloqueio', {
        marca: idx.startsWith('batavo') ? 'batavo' : 'itambe',
        idx
      });
    }).catch(e => toast('Erro: ' + e.message));
  });
}

// ════ DIVERGÊNCIA ════════════════════════════════════════════════
function abrirDivergencia(idx, marca) {
  if (usuarioLogado?.perfil !== 'adm') return;
  _divergIdx    = idx;
  _divergMarca  = marca;
  _divergMotivo = 'qtd';
  _divergFotoB64 = null;

  const b    = bases[marca];
  const item = b?.dados.find(r => r._idx === idx);
  if (!item) return;

  const cod  = item[b.mapa.codigo]    ?? '—';
  const desc = item[b.mapa.descricao] ?? '—';
  const end  = item[b.mapa.endereco]  ?? '—';
  const cx   = item[b.mapa.caixas]    ?? '—';
  const val  = fmtData(item[b.mapa.dtVal]);

  document.getElementById('divProdInfo').textContent = cod + ' · ' + desc + ' · Endereco: ' + end;
  document.getElementById('divQtdSis').value   = cx;
  document.getElementById('divQtdReal').value  = '';
  document.getElementById('divDataSis').value  = val;
  document.getElementById('divDataReal').value = '';
  document.getElementById('divEtiqSis').value  = cod;
  document.getElementById('divEtiqReal').value = '';
  document.getElementById('divDiffQtd').innerHTML = '';
  document.getElementById('divObs').value = '';
  document.getElementById('divFotoPreview').style.display = 'none';
  document.getElementById('btnRemoverFoto').style.display = 'none';
  document.getElementById('divBloquearCheck').checked = false;
  document.getElementById('divBloquearMotivo').style.display = 'none';

  setMotivoDiv('qtd');
  document.getElementById('modalDiverg').classList.add('show');
  setTimeout(() => document.getElementById('divQtdReal').focus(), 150);
}

function fecharDiverg() {
  document.getElementById('modalDiverg').classList.remove('show');
  _divergIdx = _divergMarca = null;
  _divergFotoB64 = null;
}

function setMotivoDiv(m) {
  _divergMotivo = m;
  ['qtd','data','ambos','etiqueta'].forEach(k => {
    const id = 'dm' + k.charAt(0).toUpperCase() + k.slice(1);
    document.getElementById(id)?.classList.toggle('active', k === m);
  });
  document.getElementById('divSecQtd').style.display      = (m === 'qtd'   || m === 'ambos') ? '' : 'none';
  document.getElementById('divSecData').style.display     = (m === 'data'  || m === 'ambos') ? '' : 'none';
  document.getElementById('divSecEtiqueta').style.display = (m === 'etiqueta') ? '' : 'none';
}

function atualizarDiffDiv() {
  const sis  = parseInt(document.getElementById('divQtdSis').value)  || 0;
  const real = parseInt(document.getElementById('divQtdReal').value);
  const el   = document.getElementById('divDiffQtd');
  if (isNaN(real)) { el.innerHTML = ''; return; }
  const diff = real - sis;
  const cor  = diff === 0 ? 'var(--accent)' : diff > 0 ? 'var(--yel)' : 'var(--red)';
  const sinal = diff > 0 ? '+' : '';
  el.innerHTML = '<span style="color:' + cor + ';font-weight:700">' +
    (diff === 0 ? 'Quantidade confere' : sinal + diff + ' caixas em relacao ao sistema') + '</span>';
}

function tirarFoto()    { document.getElementById('divFotoCamera').click(); }
function escolherFoto() { document.getElementById('divFotoInput').click(); }

function onFotoSelecionada(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // limpa input para permitir reenvio do mesmo arquivo

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Redimensiona mantendo proporção — máximo 800px no lado maior
      const MAX = 800;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }
      // Comprime via Canvas — JPEG 75% de qualidade
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      _divergFotoB64 = canvas.toDataURL('image/jpeg', 0.75);

      document.getElementById('divFotoImg').src = _divergFotoB64;
      document.getElementById('divFotoPreview').style.display = '';
      document.getElementById('btnRemoverFoto').style.display = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removerFotoDiverg() {
  _divergFotoB64 = null;
  document.getElementById('divFotoPreview').style.display = 'none';
  document.getElementById('btnRemoverFoto').style.display = 'none';
}

function montarMensagemDiverg() {
  const b    = bases[_divergMarca];
  const item = b?.dados.find(r => r._idx === _divergIdx);
  if (!item) return '';

  const cod   = item[b.mapa.codigo]    ?? '—';
  const desc  = item[b.mapa.descricao] ?? '—';
  const end   = item[b.mapa.endereco]  ?? '—';
  const marca = _divergMarca === 'batavo' ? 'BATAVO' : 'ITAMBE';
  const hora  = new Date().toLocaleString('pt-BR');
  const obs   = document.getElementById('divObs').value.trim();

  const motivoLabels = {
    qtd:      'Quantidade divergente',
    data:     'Data divergente',
    ambos:    'Quantidade e data divergentes',
    etiqueta: 'Etiqueta trocada'
  };
  let linhas = [
    'DIVERGENCIA DE ESTOQUE',
    '━━━━━━━━━━━━━━━━━━━━',
    marca,
    'Etiqueta: ' + cod + ' - ' + desc,
    'Endereco: ' + end,
    '',
    'Motivo: ' + motivoLabels[_divergMotivo],
  ];

  if (_divergMotivo === 'qtd' || _divergMotivo === 'ambos') {
    const sis  = document.getElementById('divQtdSis').value;
    const real = document.getElementById('divQtdReal').value;
    const diff = (parseInt(real) - parseInt(sis)) || 0;
    const sinal = diff > 0 ? '+' : '';
    linhas.push('', 'QUANTIDADE', '• Sistema: ' + sis + ' cx', '• Fisico:  ' + real + ' cx', '• Diferenca: ' + sinal + diff + ' cx');
  }
  if (_divergMotivo === 'data' || _divergMotivo === 'ambos') {
    const sis  = document.getElementById('divDataSis').value;
    const real = document.getElementById('divDataReal').value;
    linhas.push('', 'VALIDADE', '• Sistema: ' + sis, '• Fisico:  ' + real);
  }
  if (_divergMotivo === 'etiqueta') {
    const etiqSis  = document.getElementById('divEtiqSis').value;
    const etiqReal = document.getElementById('divEtiqReal').value;
    linhas.push('', 'ETIQUETA', '• Codigo na etiqueta: ' + etiqSis, '• Produto fisico:     ' + (etiqReal || 'nao identificado'));
  }

  linhas.push('', '━━━━━━━━━━━━━━━━━━━━', 'Usuario: ' + usuarioLogado.nome + ' · Cracha ' + usuarioLogado.cracha, 'Hora: ' + hora);
  if (obs) linhas.push('Obs: ' + obs);

  return linhas.join('\n');
}

async function compartilharDivergencia() {
  const msg = montarMensagemDiverg();
  if (!msg) return;

  if (navigator.share) {
    try {
      const shareData = { text: msg };

      // Adiciona foto se tiver — monta o File antes do share
      if (_divergFotoB64) {
        try {
          const res  = await fetch(_divergFotoB64);
          const blob = await res.blob();
          const file = new File([blob], 'divergencia.jpg', { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        } catch(e) { /* ignora erro de foto, compartilha só o texto */ }
      }

      // Compartilha ANTES de salvar para manter o gesto do usuário
      await navigator.share(shareData);

      // Salva no Firebase depois do compartilhamento
      await _salvarDivergenciaDB();
      toast('Sucesso: compartilhado e salvo');
      fecharDiverg();
    } catch(e) {
      if (e.name === 'AbortError') {
        // Usuário cancelou o compartilhamento — não faz nada
      } else {
        // Erro real — tenta copiar como fallback
        try {
          await navigator.clipboard.writeText(msg);
          toast('Texto copiado. Cole no WhatsApp.');
        } catch(_) {
          toast('Erro: ' + e.message);
        }
      }
    }
  } else {
    // Navegador não suporta Web Share API — copia o texto
    try {
      await navigator.clipboard.writeText(msg);
      await _salvarDivergenciaDB();
      toast('Texto copiado. Cole no WhatsApp.');
      fecharDiverg();
    } catch(e) {
      toast('Compartilhamento não suportado neste navegador');
    }
  }
}

async function salvarDivergencia() {
  await _salvarDivergenciaDB();
  toast('Sucesso: divergencia salva no sistema');
  fecharDiverg();
}

async function _salvarDivergenciaDB() {
  const b    = bases[_divergMarca];
  const item = b?.dados.find(r => r._idx === _divergIdx);
  if (!item) return;

  const entry = {
    idx:       _divergIdx,
    marca:     _divergMarca,
    motivo:    _divergMotivo,
    codigo:    item[b.mapa.codigo]    ?? '—',
    descricao: item[b.mapa.descricao] ?? '—',
    endereco:  item[b.mapa.endereco]  ?? '—',
    qtdSis:    document.getElementById('divQtdSis').value   || null,
    qtdReal:   document.getElementById('divQtdReal').value  || null,
    dataSis:   document.getElementById('divDataSis').value  || null,
    dataReal:  document.getElementById('divDataReal').value || null,
    etiqSis:   document.getElementById('divEtiqSis').value  || null,
    etiqReal:  document.getElementById('divEtiqReal').value || null,
    obs:       document.getElementById('divObs').value.trim() || null,
    // foto: não persiste no Firebase — usada apenas para compartilhamento e descartada
    nome:      usuarioLogado.nome,
    cracha:    usuarioLogado.cracha,
    hora:      new Date().toLocaleString('pt-BR'),
    ts:        Date.now(),
  };
  try {
    await db.ref('divergencias').push(entry);
    registrarLog('divergencia', { marca: _divergMarca, codigo: entry.codigo, descricao: entry.descricao, endereco: entry.endereco });

    // Bloqueia se checkbox marcado
    const bloquear = document.getElementById('divBloquearCheck').checked;
    if (bloquear) {
      const motivo = document.getElementById('divMotivoBloquear').value;
      bloquearItem(_divergIdx, motivo);
    }
  } catch(e) { toast('Erro ao salvar: ' + e.message); }
}

// ════ TOAST ESPECIAL ══════════════════════════════════════════════
let _ttE;
function toastEspecial(msg, classe) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (classe || '');
  clearTimeout(_ttE);
  _ttE = setTimeout(() => { el.classList.remove('show'); el.className = 'toast'; }, 4000);
}

// ════ TOAST ═══════════════════════════════════════════════════════
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2500);
}

// ════ INIT ════════════════════════════════════════════════════════
// ════ SESSÃO PERSISTENTE ══════════════════════════════════════════
const SESSAO_KEY = 'estoque-sessao-v1';

function salvarSessao() {
  try {
    localStorage.setItem(SESSAO_KEY, JSON.stringify({
      usuarioLogado,
      marcaAtiva,
      ts: Date.now()
    }));
  } catch(e) {}
}

function limparSessao() {
  try { localStorage.removeItem(SESSAO_KEY); } catch(e) {}
}

function restaurarSessao() {
  try {
    const raw = localStorage.getItem(SESSAO_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    // Expira após 4 horas (1 turno de trabalho)
    if (Date.now() - (s.ts || 0) > 4 * 3600000) { limparSessao(); return false; }
    if (!s.usuarioLogado) return false;
    usuarioLogado = s.usuarioLogado;
    marcaAtiva    = s.marcaAtiva || '';
    return true;
  } catch(e) { return false; }
}

function renderDrawer() {
  const isAdm = usuarioLogado?.perfil === 'adm';
  document.getElementById('drawerUser').textContent = (usuarioLogado?.nome || '');
  document.getElementById('drawerSub').textContent  = marcaAtiva === 'ambas' ? 'Acesso completo' : 'Base ' + (marcaAtiva === 'batavo' ? 'Batavo' : 'Itambe');

  const pillsEl = document.getElementById('drawerPills');
  let pills = '';
  if (marcaAtiva === 'ambas' || marcaAtiva === 'batavo') pills += '<span class="drawer-pill batavo">BATAVO</span>';
  if (marcaAtiva === 'ambas' || marcaAtiva === 'itambe') pills += '<span class="drawer-pill itambe">ITAMBE</span>';
  pillsEl.innerHTML = pills;

  const vencCount    = document.getElementById('badgeVenc')?.textContent || '';
  const resCount     = document.getElementById('badgeRes')?.textContent  || '';
  const icon=function(name){ return '<i class="bi '+name+'"></i>'; };

  const items = isAdm ? [
    { id:'consulta',    icon:icon('bi-search'), label:'Consulta' },
    { id:'vencimentos', icon:icon('bi-hourglass-split'), label:'Vencimentos', badge: vencCount },
    { id:'reservados',  icon:icon('bi-bookmark-check'), label:'Reservados',  badge: resCount },
    { id:'baixas',      icon:icon('bi-graph-down-arrow'), label:'Baixas' },
    { id:'log',         icon:icon('bi-list-check'), label:'Log' },
    { sep: true },
    { id:'base',  icon:icon('bi-database'), label:'Base de Dados' },
    { id:'admin', icon:icon('bi-person-gear'), label:'Admin' },
    { sep: true },
    { id:'_temas', icon:icon('bi-palette'), label:'Temas' },
  ] : usuarioLogado?.perfil === 'guest' ? [
    { id:'consulta', icon:icon('bi-search'), label:'Consulta' },
    { sep: true },
    { id:'_temas',   icon:icon('bi-palette'), label:'Temas' },
  ] : [
    { id:'consulta',    icon:icon('bi-search'), label:'Consulta' },
    { id:'vencimentos', icon:icon('bi-hourglass-split'), label:'Vencimentos', badge: vencCount },
    { sep: true },
    { id:'_temas',      icon:icon('bi-palette'), label:'Temas' },
    { id:'_trocarbase', icon:icon('bi-arrow-repeat'), label:'Trocar Base' },
  ];

  const nav = document.getElementById('drawerNav');
  nav.innerHTML = items.map(function(it){
    if (it.sep) return '<div class="drawer-sep"></div>';
    const isActive = it.id === _tabAtual;
    const badge    = it.badge ? '<span class="drawer-item-badge">' + it.badge + '</span>' : '';
    return '<div class="drawer-item' + (isActive ? ' active' : '') + '" onclick="drawerNavegar(\'' + it.id + '\')">' +
      '<span class="drawer-item-icon">' + it.icon + '</span>' +
      '<span class="drawer-item-label">' + it.label + '</span>' +
      badge +
    '</div>';
  }).join('');
}

function iniciarRelogio() {
  const el = document.getElementById('headerClock');
  if (!el) return;
  const tick = () => {
    const n = new Date();
    el.textContent = n.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };
  tick();
  _relogioInterval = setInterval(tick, 1000);
}

function pararRelogio() {
  if (_relogioInterval) { clearInterval(_relogioInterval); _relogioInterval = null; }
  const el = document.getElementById('headerClock');
  if (el) el.textContent = '';
}

// ════ SIDEBAR ══════════════════════════════════════════════════════
function renderSidebar() {
  renderSidebarBase();
  renderSidebarDia();
  renderSidebarVenc();
}

function renderSidebarBase() {
  const el = document.getElementById('sbBase');
  if (!el) return;
  const marcas = marcaAtiva === 'ambas' ? ['batavo','itambe'] : (marcaAtiva ? [marcaAtiva] : []);
  if (!marcas.length) { el.innerHTML = '<span class="sb-empty">Nenhuma base ativa</span>'; return; }
  let html = '';
  marcas.forEach(m => {
    const b   = bases[m];
    const cor = m === 'batavo' ? 'batavo' : 'itambe';
    const nome = m === 'batavo' ? 'Batavo' : 'Itambé';
    if (!b.carregada) {
      html += '<div class="sb-base-item">' +
        '<div class="sb-base-dot ' + cor + '"></div>' +
        '<div class="sb-base-info">' +
          '<div class="sb-base-nome">' + nome + '</div>' +
          '<div class="sb-base-sub">Base não carregada</div>' +
        '</div></div>';
    } else {
      const total = b.dados.length;
      const arch  = b.arquivo ? b.arquivo.split(/[\\/]/).pop() : '—';
      const por   = b.carregadoPor || '—';
      html += '<div class="sb-base-item">' +
        '<div class="sb-base-dot ' + cor + '"></div>' +
        '<div class="sb-base-info">' +
          '<div class="sb-base-nome">' + escapeHtml(arch) + '</div>' +
          '<div class="sb-base-sub">por ' + escapeHtml(por) + '</div>' +
        '</div>' +
        '<div class="sb-base-count">' + total + '</div>' +
        '</div>';
    }
  });
  el.innerHTML = html;
}

function renderSidebarDia() {
  const el = document.getElementById('sbDia');
  if (!el) return;
  const hojeStr = new Date().toDateString();
  const logHoje = logDB.filter(e => e.ts && new Date(e.ts).toDateString() === hojeStr);
  const reservas  = logHoje.filter(e => e.acao === 'reserva').length;
  const baixas    = logHoje.filter(e => e.acao === 'baixa').length;
  const contagens = logHoje.filter(e => e.acao === 'contagem').length;
  const cancelamentos = logHoje.filter(e => e.acao === 'cancelamento').length;
  const total = logHoje.length;
  if (!total) { el.innerHTML = '<span class="sb-empty">Sem atividade hoje</span>'; return; }
  el.innerHTML =
    '<div class="sb-stat-row"><span class="sb-stat-label">Total de ações</span><span class="sb-stat-val">' + total + '</span></div>' +
    (reservas    ? '<div class="sb-stat-row"><span class="sb-stat-label">Reservas</span><span class="sb-stat-val blue">' + reservas + '</span></div>' : '') +
    (baixas      ? '<div class="sb-stat-row"><span class="sb-stat-label">Baixas</span><span class="sb-stat-val green">' + baixas + '</span></div>' : '') +
    (contagens   ? '<div class="sb-stat-row"><span class="sb-stat-label">Contagens</span><span class="sb-stat-val ora">' + contagens + '</span></div>' : '') +
    (cancelamentos ? '<div class="sb-stat-row"><span class="sb-stat-label">Cancelamentos</span><span class="sb-stat-val red">' + cancelamentos + '</span></div>' : '');
}

function renderSidebarVenc() {
  const el = document.getElementById('sbVenc');
  if (!el) return;
  const criticos = _indice
    .filter(e => e._diasVal !== null && e._diasVal <= 7)
    .sort((a, b) => a._diasVal - b._diasVal)
    .slice(0, 8);
  if (!criticos.length) { el.innerHTML = '<span class="sb-empty">Nenhum crítico</span>'; return; }
  let html = '';
  criticos.forEach(e => {
    const dias = e._diasVal;
    let badge, cls;
    if (dias < 0)       { badge = 'VENCIDO'; cls = 'vencido'; }
    else if (dias === 0){ badge = 'HOJE';    cls = 'vencido'; }
    else                { badge = dias + 'd'; cls = 'critico'; }
    html += '<div class="sb-venc-item">' +
      '<span class="sb-venc-badge ' + cls + '">' + badge + '</span>' +
      '<div class="sb-venc-info">' +
        '<div class="sb-venc-desc">' + escapeHtml(e.desc) + '</div>' +
        '<div class="sb-venc-val">' + (e.val || '—') + '</div>' +
      '</div></div>';
  });
  el.innerHTML = html;
}

function initTypewriter() {
  const el1 = document.querySelector('.ll-type-1');
  const el2 = document.querySelector('.ll-type-2');
  const el3 = document.querySelector('.ll-type-3');
  const cursor = document.querySelector('.ll-cursor');
  if (!el1 || !el2) return;
  el1.textContent = '';
  el2.textContent = '';
  if (el3) el3.textContent = '';

  const word1 = 'Estoque';
  const word2 = 'CD';
  const word3 = 'Rio de Janeiro';
  let i = 0, j = 0, k = 0;

  function typeWord1() {
    if (i < word1.length) { el1.textContent += word1[i++]; setTimeout(typeWord1, 100); }
    else setTimeout(typeWord2, 220);
  }
  function typeWord2() {
    if (j < word2.length) { el2.textContent += word2[j++]; setTimeout(typeWord2, 160); }
    else setTimeout(typeWord3, 280);
  }
  function typeWord3() {
    if (!el3) return;
    if (k < word3.length) { el3.textContent += word3[k++]; setTimeout(typeWord3, 75); }
    else setTimeout(() => {
      if (cursor) { cursor.style.animation = 'none'; cursor.style.opacity = '0'; }
    }, 1800);
  }

  setTimeout(typeWord1, 550);
}

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();

  // Versão — injetada em todos os pontos via constante única
  const verEl = document.getElementById('loginVersion');
  if (verEl) verEl.textContent = APP_VERSION;
  const verFooter = document.getElementById('loginVersionFooter');
  if (verFooter) verFooter.textContent = APP_VERSION;
  const drawerVer = document.getElementById('drawerVersion');
  if (drawerVer) drawerVer.textContent = APP_VERSION;

  // Tema salvo
  try {
    const saved = localStorage.getItem('estoque-tema') ?? '';
    aplicarTema(saved); // aplica tema salvo (ou padrão se vazio)
  } catch(e) { aplicarTema(''); }
  normalizarUIVisual();

  // Inicia listeners Firebase
  initListeners();
  carregarSenhaAdm();

  // ── Restaura sessão automaticamente ──
  if (restaurarSessao()) {
    // Valida se usuário comum ainda está cadastrado no Firebase
    if (usuarioLogado.perfil === 'adm') {
      irParaApp();
    } else {
      // Re-verifica permissões no Firebase (podem ter mudado)
      db.ref('usuarios/' + usuarioLogado.cracha).get().then(snap => {
        if (!snap.exists()) { limparSessao(); return; }
        const u = snap.val();
        // Atualiza permissões caso tenham mudado
        usuarioLogado.basePerm = u.basePerm || 'ambas';
        salvarSessao();
        if (marcaAtiva) {
          irParaApp();
        } else {
          irParaBaseSelect();
        }
      }).catch(() => {
        // Sem internet — usa sessão em cache mesmo assim
        if (marcaAtiva) irParaApp();
        else irParaBaseSelect();
      });
    }
  }

  // ── PWA: Registro do Service Worker ──
  let _swRegistration = null;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      _swRegistration = reg;

      // Detecta quando um novo SW está esperando para ativar
      const checkWaiting = (r) => {
        if (r.waiting) {
          document.getElementById('updateBanner').style.display = 'flex';
        }
      };
      checkWaiting(reg);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            document.getElementById('updateBanner').style.display = 'flex';
          }
        });
      });
    }).catch(err => console.log('SW erro:', err));

    // Quando o SW novo assumir, recarrega a página automaticamente
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  }

  window.aplicarAtualizacao = () => {
    document.getElementById('updateBanner').style.display = 'none';
    if (_swRegistration && _swRegistration.waiting) {
      // Manda mensagem para o SW em espera assumir o controle
      _swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  // ── PWA: Banner de instalação ──
  let _pwaPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _pwaPrompt = e;
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'flex';
  });
  window.instalarPWA = () => {
    if (!_pwaPrompt) return;
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        document.getElementById('installBanner').style.display = 'none';
        toast('App instalado com sucesso!');
      }
      _pwaPrompt = null;
    });
  };
  // Esconde banner se já está instalado
  window.addEventListener('appinstalled', () => {
    document.getElementById('installBanner').style.display = 'none';
    _pwaPrompt = null;
  });
});