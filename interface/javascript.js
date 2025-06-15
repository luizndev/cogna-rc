const { ipcRenderer, shell } = require('electron');
const { sleep } = require('../components/sleep.js')
const XLSX = require('xlsx');
const QRCode = require('qrcode');
let dadosDaPlanilha = [];
let step = 0;


if(localStorage.getItem('login') === 'true'){
  stepMaster(1);
}else{
  stepMaster(0);
}

function stepMaster(step) {
  const loginContainer = document.getElementById('login');
  const cadastroContainer = document.getElementById('cadastro');
  const homepageContainer = document.getElementById('homepage');

  switch (step) {
    case 0:
      loginContainer.style.display = 'flex';
      cadastroContainer.style.display = 'none';
      homepageContainer.style.display = 'none';
      break;
    case 1:
      loginContainer.style.display = 'none';
      cadastroContainer.style.display = 'flex';
      homepageContainer.style.display = 'none';
      break;
    case 2:
      loginContainer.style.display = 'none';
      cadastroContainer.style.display = 'none';
      homepageContainer.style.display = 'flex';
      break;
    default:
      console.error('Step inválido:', step);
  }

}

document.getElementById('excelFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const primeiraAba = workbook.SheetNames[0];
    const planilha = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

    dadosDaPlanilha = planilha;
    renderTabela(planilha);
  };

  reader.readAsArrayBuffer(file);
});

function renderTabela(dados) {
  const container = document.getElementById('tabela-container');
  container.innerHTML = '';

  if (dados.length === 0) return;

  const tabela = document.createElement('table');

  // Cria o thead
  const thead = document.createElement('thead');
  const cabecalho = document.createElement('tr');
  Object.keys(dados[0]).forEach(coluna => {
    const th = document.createElement('th');
    th.innerText = coluna;
    cabecalho.appendChild(th);
  });
  thead.appendChild(cabecalho);
  tabela.appendChild(thead);

  // Cria o tbody
  const tbody = document.createElement('tbody');
  dados.forEach(linha => {
    const tr = document.createElement('tr');
    Object.values(linha).forEach(valor => {
      const td = document.createElement('td');
      td.innerText = valor;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tabela.appendChild(tbody);

  container.appendChild(tabela);
}



// SISTEMA DE AUTENTICAÇÃO - LOGIN
document.getElementById('button-login').addEventListener('click', async (e) => {
  e.preventDefault();

  const buttonLogin = document.getElementById('button-login');
  const erroContainer = document.getElementById('msg-erro');
  const erroMensgagem = document.getElementById('msg-text');

  buttonLogin.innerHTML = "<span class='spinner-border spinner-border-sm' role='status' aria-hidden='true'></span> Carregando...";
  buttonLogin.disabled = true;
  buttonLogin.style.cursor = 'not-allowed';
  buttonLogin.style.backgroundColor = '#6c757d';
  buttonLogin.style.opacity = '50%';
  erroContainer.style.display = 'none';

  const email = document.getElementById('email-login').value;
  const senha = document.getElementById('senha-login').value;

  try {
    const response = await fetch('https://api-gio.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: senha })
    });

    const data = await response.json(); 

    if (!response.ok) {
      console.error('Erro na resposta do servidor:', data);

      if(data.msg){
        erroContainer.style.display = 'block';
        erroMensgagem.innerHTML = data.msg;
      }
      buttonLogin.innerHTML = "Fazer Login";
      buttonLogin.disabled = false;
      buttonLogin.style.cursor = 'pointer';
      buttonLogin.style.backgroundColor = 'var(--cor)';
      buttonLogin.style.opacity = '100%';
      throw new Error('Erro ao fazer login');

    }

    const { token } = data; 

    if(token){
      console.log("Login feito com Sucesso!");
      console.log('Token recebido:', token);

      buttonLogin.innerHTML = "Login feito com sucesso!";
      buttonLogin.disabled = true;
      buttonLogin.style.cursor = 'pointer';
      buttonLogin.style.backgroundColor = '#29fe5e';
      buttonLogin.style.opacity = '100%';

      localStorage.setItem('token', token);
      localStorage.setItem('login', true);

      setTimeout(() => {
        stepMaster(1)
      }, 2000);
    }

  } catch (err) {
    console.error('Erro durante o login:', err.message);
  }
});

let arquivoSelecionado = null;

document.getElementById('input-anexo').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    arquivoSelecionado = file;
    console.log('Arquivo anexado:', file.name);
  }
});

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Remove prefixo base64
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('rapido').addEventListener('change', () => {
  if (document.getElementById('rapido').checked) {
    document.getElementById('digitando').checked = false;
  }
});
document.getElementById('digitando').addEventListener('change', () => {
  if (document.getElementById('digitando').checked) {
    document.getElementById('rapido').checked = false;
  }
});

let total = 0;
let enviados = 0;
let enviadosGrupo = 0;
let lista = [];
let listaGrupo = [];
let pararEnvio = false;


function pararMensagens() {
  pararEnvio = true;
  console.log("Envio pausado!")
  closeMockup();
  document.getElementById('footer-progress').style.display = 'none';
  document.getElementById('mensagem-final').innerHTML = '';
}

// RETORNO DO BACK-END SOBRE SEND MENSAGEM!
ipcRenderer.on('send-message', async () => {
  // Se o usuário quiser parar o envio
  if (pararEnvio) {
    document.getElementById('mensagem-final').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="18" viewBox="0 0 20 18" fill="none"><path d="M6.53572 7.95917L8.52857 9.85715L13.1786 5.42858M9.85714 2.76144L9.6862 2.58018C7.49673 0.258804 3.87567 0.53166 2.01784 3.15799C0.368917 5.48902 0.763823 8.78709 2.90982 10.6073L9.85714 16.5L16.8045 10.6073C18.9504 8.78709 19.3454 5.48902 17.6965 3.15799C15.8386 0.531649 12.2176 0.258804 10.0281 2.58018L9.85714 2.76144Z" stroke="#ff0000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Envio cancelado pelo usuário!`;
    document.getElementById('footer-progress').style.display = 'flex';
    return;
  }

  let delay = parseInt(document.getElementById('delay').value) || 0;
  enviados++;

  let porcentagem = Math.round((enviados / total) * 100);
  document.getElementById('barra-progresso').style.width = porcentagem + '%';
  document.getElementById('info-progresso').innerHTML = `Enviados: ${enviados} | Total: ${total}`;

  if (enviados >= total) {
    document.getElementById('footer-pause').style.display = 'none';
    document.getElementById('mensagem-final').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="18" viewBox="0 0 20 18" fill="none"><path d="M6.53572 7.95917L8.52857 9.85715L13.1786 5.42858M9.85714 2.76144L9.6862 2.58018C7.49673 0.258804 3.87567 0.53166 2.01784 3.15799C0.368917 5.48902 0.763823 8.78709 2.90982 10.6073L9.85714 16.5L16.8045 10.6073C18.9504 8.78709 19.3454 5.48902 17.6965 3.15799C15.8386 0.531649 12.2176 0.258804 10.0281 2.58018L9.85714 2.76144Z" stroke="#8629FE" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Todos os envios foram concluídos!`;
    document.getElementById('footer-progress').style.display = 'flex';
    return;
  }

  await sleep(delay); 
  enviarProximo();
});


// RETORNO DO BACK-END SOBRE SEND MENSAGEM!
ipcRenderer.on('send-message-grupo', async () => {
  if (pararEnvio) {
    document.getElementById('mensagem-final').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="18" viewBox="0 0 20 18" fill="none"><path d="M6.53572 7.95917L8.52857 9.85715L13.1786 5.42858M9.85714 2.76144L9.6862 2.58018C7.49673 0.258804 3.87567 0.53166 2.01784 3.15799C0.368917 5.48902 0.763823 8.78709 2.90982 10.6073L9.85714 16.5L16.8045 10.6073C18.9504 8.78709 19.3454 5.48902 17.6965 3.15799C15.8386 0.531649 12.2176 0.258804 10.0281 2.58018L9.85714 2.76144Z" stroke="#ff0000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Envio cancelado pelo usuário!`;
    document.getElementById('footer-progress').style.display = 'flex';
    return;
  }

  let delay = parseInt(document.getElementById('delay').value) || 0;
  enviadosGrupo++;

  let porcentagem = Math.round((enviadosGrupo / total) * 100);
  document.getElementById('barra-progresso').style.width = porcentagem + '%';
  document.getElementById('info-progresso').innerHTML = `Enviados: ${enviadosGrupo} | Total: ${total}`;

  if (enviadosGrupo >= total) {
    document.getElementById('footer-pause').style.display = 'none';
    document.getElementById('mensagem-final').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="18" viewBox="0 0 20 18" fill="none"><path d="M6.53572 7.95917L8.52857 9.85715L13.1786 5.42858M9.85714 2.76144L9.6862 2.58018C7.49673 0.258804 3.87567 0.53166 2.01784 3.15799C0.368917 5.48902 0.763823 8.78709 2.90982 10.6073L9.85714 16.5L16.8045 10.6073C18.9504 8.78709 19.3454 5.48902 17.6965 3.15799C15.8386 0.531649 12.2176 0.258804 10.0281 2.58018L9.85714 2.76144Z" stroke="#8629FE" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Todos os envios foram concluídos!`;
    document.getElementById('footer-progress').style.display = 'flex';
    return;
  }

  await sleep(delay); 
  enviarProximoGrupo();
});

let listaSelecionados = [];

document.getElementById('sendMessageGrupo').addEventListener('click', async () => {
  pararEnvio = false;

  const checkboxes = document.querySelectorAll('#listaGrupos input[type="checkbox"]:checked');
  const gruposSelecionados = [];

  checkboxes.forEach(cb => {
    gruposSelecionados.push({
      Nome: cb.name,
      id: cb.value
    });
  });

  listaSelecionados.length = 0;
  listaSelecionados.push(...gruposSelecionados);

  const modeloMensagem = document.querySelector('#textareaGrupo').value;
  const barra = document.querySelector('#barra-progresso');
  document.getElementById('info-progresso').innerHTML = ``;
  const container = document.querySelector('#progresso-container');
  const mensagemFinal = document.querySelector('#mensagem-final');

  barra.style.width = '0%';
  container.style.display = 'block';
  mensagemFinal.innerText = '';
  document.querySelector('#footer-progress').style.display = 'none';
  document.querySelector('#footer-pause').style.display = 'flex';
  enableMockup('processo');

  enviadosGrupo = 0;
  listaGrupo = [];

for (const grupo of gruposSelecionados) {
  let mensagemPersonalizada = modeloMensagem;

  mensagemPersonalizada = mensagemPersonalizada.replace(/\{\s*\[([^\[\]]+)\]\s*([+\-*/])\s*([^\}]+?)\s*\}/g, (_, variavel, operador, outroValor) => {
    try {
      const valor1 = Number(variavel.trim());
      const valor2 = Number(outroValor.trim());
      const resultado = Function(`"use strict"; return (${valor1} ${operador} ${valor2})`)();
      return resultado;
    } catch {
      return `{Erro: {[${variavel}] ${operador} ${outroValor}}}`;
    }
  });

  mensagemPersonalizada = mensagemPersonalizada.replace(/\{([^{}]+)\}/g, (_, expressao) => {
    try {
      return Function(`"use strict"; return (${expressao})`)();
    } catch {
      return `{Erro: ${expressao}}`;
    }
  });

  const mensagemGrupo = {
    grupoId: grupo.id,
    grupoNome: grupo.Nome,
    mensagem: mensagemPersonalizada,
    digitando: 0,
    anexo: arquivoSelecionado ? {
      nome: arquivoSelecionado.name,
      tipo: arquivoSelecionado.type,
      conteudo: await arquivoParaBase64(arquivoSelecionado)
    } : null
  };

  listaGrupo.push(mensagemGrupo);
}


  total = listaGrupo.length;
  enviarProximoGrupo(); // ou: enviarProximoGrupo(enviados, lista);
});

function enviarProximoGrupo() {
  if (enviadosGrupo < listaGrupo.length) {
    const item = listaGrupo[enviadosGrupo];
    console.log("Enviando para back-end:", item);
    ipcRenderer.send('enviar-grupo', [item]);
  }
}

document.getElementById('sendMessage').addEventListener('click', async () => {
  pararEnvio = false;
  if (!dadosDaPlanilha || dadosDaPlanilha.length === 0) {
    alert('Por favor, selecione uma planilha primeiro!');
    return;
  }

  let digito = document.getElementById('digitando').checked ? 1 : 0;
  const modeloMensagem = document.getElementById('textarea').value;
  const barra = document.getElementById('barra-progresso');
  const container = document.getElementById('progresso-container');
  const mensagemFinal = document.getElementById('mensagem-final');
  document.getElementById('info-progresso').innerHTML = ``;

  barra.style.width = '0%';
  container.style.display = 'block';
  mensagemFinal.innerText = '';
  document.getElementById('footer-progress').style.display = 'none';
  document.getElementById('footer-pause').style.display = 'flex';
  enableMockup('processo');

  enviados = 0;
  lista = await Promise.all(dadosDaPlanilha.map(async item => {
    let mensagemFinal = modeloMensagem;

    Object.entries(item).forEach(([chave, valor]) => {
      const regex = new RegExp(`\\[${chave}\\]`, 'gi');
      mensagemFinal = mensagemFinal.replace(regex, valor);
    });

    mensagemFinal = mensagemFinal.replace(/\{\s*\[([^\[\]]+)\]\s*([+\-*/])\s*([^\}]+?)\s*\}/g, (_, variavel, operador, outroValor) => {
      try {
        const valor1 = Number(item[variavel.trim()] ?? 0);
        const valor2 = Number(outroValor.trim());
        const resultado = Function(`"use strict"; return (${valor1} ${operador} ${valor2})`)();
        return resultado;
      } catch {
        return `{Erro: {[${variavel}] ${operador} ${outroValor}}}`;
      }
    });

    mensagemFinal = mensagemFinal.replace(/\{([^{}]+)\}/g, (_, expressao) => {
      try {
        return Function(`"use strict"; return (${expressao})`)();
      } catch {
        return `{Erro: ${expressao}}`;
      }
    });

    return {
      numero: String(item.Numero || item.numero || item.tefefone || item.Telefone || item.contato || item.Contato),
      mensagem: mensagemFinal,
      digitando: digito,
      anexo: arquivoSelecionado ? {
        nome: arquivoSelecionado.name,
        tipo: arquivoSelecionado.type,
        conteudo: await arquivoParaBase64(arquivoSelecionado)
      } : null
    };
  }));

  total = lista.length;
  enviarProximo();
});

function enviarProximo() {
  if (enviados < lista.length) {
    const item = lista[enviados];
    ipcRenderer.send('enviar-lista', [item]);
  }
}

ipcRenderer.on('qr-code', (event, qrData) => {
  const canvas = document.getElementById('qrCanvas');

  QRCode.toCanvas(canvas, qrData, function (error) {
    if (error){
      console.error('Erro ao gerar QR Code:', error);
    } else {
      console.log('✅ QR Code gerado com sucesso!');
      document.getElementById('loading-cadastro').style.display = "none";
      document.getElementById('onloading-cadastro').style.display = "flex";
    } 
  });
});


ipcRenderer.on('verify-connect', (event, response) => {
  switch (response) {
    case true:
      stepMaster(2)
      console.log('OK Bot conectado!');
      break;
      case false:
      stepMaster(1)
      console.log('❌ Bot desconectado!');
      break;
    default:
      console.log('❓ Status desconhecido do bot:', response);
  }
});

ipcRenderer.on('dados-usuario', (event, dados) => {
  console.log('✅ Dados do usuário:', dados);
  document.getElementById('nomeUsuario').innerText = dados.nome;
  const numeroUser = dados.numero;
  const numeroSplit = numeroUser.split('@')[0].split(":")
  document.getElementById('numeroUsuario').innerText = `+${numeroSplit[0]}${numeroSplit[1]}`;
  // document.getElementById('fotoUsuario').src = dados.foto;
 document.getElementById('fotoUsuario').style.backgroundImage = `url(${dados.foto})`;

 const ul = document.getElementById('listaGrupos');
  ul.innerHTML = '';
  enableGrupos(dados.grupos)
  // console.log(JSON.stringify(dados.grupos))

  dados.grupos.forEach(grupo => {
    const li = document.createElement('li');

    const label = document.createElement('label');
    label.className = 'container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = grupo.id;
    checkbox.name = grupo.nome;

    const checkmarkDiv = document.createElement('div');
    checkmarkDiv.className = 'checkmark2';

    const descricao = document.createElement('span');
    descricao.innerText = `${grupo.nome} - (${grupo.participantes} membros)`;

    label.appendChild(checkbox);
    label.appendChild(checkmarkDiv);
    label.appendChild(descricao);

    li.appendChild(label);
    ul.appendChild(li);
  });


  document.getElementById('loading-homepage').style.display = "none";
  document.getElementById('onloading-homepage').style.display = "flex";
});

function formatarNumeroBrasil(numero) {
  const apenasNumeros = numero.replace(/\D/g, '');

  let numeroFormatado;
  if (apenasNumeros.length === 13 && apenasNumeros.startsWith('55')) {
    numeroFormatado = '+' + apenasNumeros;
  } else if (apenasNumeros.length === 11) {
    const ddd = apenasNumeros.slice(0, 2);
    const restante = apenasNumeros.slice(2);
    numeroFormatado = `+55 ${ddd} ${restante}`;
  } else {
    return 'Número inválido';
  }

  return numeroFormatado;
}


document.querySelector("#linkProfile").addEventListener('click', (e) => {
  e.preventDefault();
  shell.openExternal('https://www.linkedin.com/in/luiseduardo-andrade/');
})


function handlePage(page) {
  const paginaPrivado = document.getElementById('privado');
  const paginaGrupo = document.getElementById('grupo');
  const paginaChip = document.getElementById('chip');
  const paginaBase = document.getElementById('base');
  const paginaChat = document.getElementById('chat');
  const paginaPadrao = document.getElementById('padrao');

  const buttonPrivado = document.querySelector('#button-privado .iconMenu');
  const buttonGrupo = document.querySelector('#button-grupo .iconMenu');
  const buttonChip = document.querySelector('#button-chip .iconMenu');
  const buttonBase = document.querySelector('#button-base .iconMenu');
  const buttonChat = document.querySelector('#button-chat .iconMenu');
  const buttonPadrao = document.querySelector('#button-padrao .iconMenu');

  const buttonAll = [
    buttonPrivado,
    buttonGrupo,
    buttonChip,
    buttonBase
    // buttonChat,
    // buttonPadrao
  ];


  const todasAsPaginas = [
    paginaPrivado,
    paginaGrupo,
    paginaChip,
    paginaBase,
    paginaChat,
    paginaPadrao
  ];

  todasAsPaginas.forEach(pagina => {
    pagina.style.display = 'none';
  });

  buttonAll.forEach(button => {
    button.style.backgroundColor = "#2e313817";
    button.classList.remove('ativo'); 
  });

  function ativarPagina(pagina, botao) {
    pagina.style.display = 'flex';
    botao.style.backgroundColor = "#8529fe25";
    botao.classList.add('ativo'); 
  }

  switch (page) {
    case 'privado':
      ativarPagina(paginaPrivado, buttonPrivado);
      break;
    case 'grupo':
      ativarPagina(paginaGrupo, buttonGrupo);
      break;
    case 'chip':
      ativarPagina(paginaChip, buttonChip);
      break;
    case 'base':
      ativarPagina(paginaBase, buttonBase);
      break;
    case 'padrao':
      ativarPagina(paginaPadrao, buttonPadrao);
      break;
    case 'chat':
      ativarPagina(paginaChat, buttonChat);
      break;
    default:
      console.log("Página desconhecida:", page);
      break;
  }
}




function show() {
  const titulo = document.getElementById('tooltip');
  titulo.style.animation = 'enterLateral 0.4s forwards';
}

function hide() {
  const titulo = document.getElementById('tooltip');
  titulo.style.animation = 'leaveLateral 0.4s forwards';
}



function enableMockup(valor) {
  switch (valor) {
    case 'mensagem':
      const infoMensagme = document.getElementById("info-mensagem")
      document.getElementById("mockups").style.display = 'block'
      infoMensagme.style.display = 'block'
      infoMensagme.style.animation = 'enterTop 0.7s forwards';
      break;
    case 'processo':
      document.getElementById("mockups").style.display = 'block';
      document.getElementById("loading-message").style.display = 'flex';
      document.getElementById("loading-message").style.animation = 'enterTop 0.7s forwards';
      break;
    default : 
      console.log("Nenhuma case encontrada") 
      break;
  }
}

function closeMockup() {
  const listMockup = ["mockups", "info-mensagem", "loading-message"]

  listMockup.forEach(mockup => {
    document.getElementById(mockup).style.display = 'none';
  })

}


function handleLogoff() {
  localStorage.clear();
  stepMaster(0);
  ipcRenderer.send('realizar-logout');
}


var listNumber = [];

// MOSTRAR OS GRUPOS DA TELA!
function enableGrupos(grupos) {
  const select = document.getElementById('extrairBase');
  const listaNumeros = document.getElementById('listaNumeros');

  grupos.forEach(grupo => {
    const option = document.createElement('option');
    option.value = grupo.id;
    option.textContent = `${grupo.nome} (${grupo.participantes} membros)`;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const grupoSelecionado = grupos.find(grupo => grupo.id === select.value);
    listaNumeros.innerHTML = '';
    listNumber = []; 

    if (grupoSelecionado) {
      grupoSelecionado.participants.forEach(p => {
        const li = document.createElement('li');
        const numero = p.id.replace('@s.whatsapp.net', '');
        li.textContent = numero;
        listNumber.push(numero); 
        listaNumeros.appendChild(li);
      });
    }

    console.log('Números salvos:', listNumber);
  });
}

function handleExport(){
  if(listNumber.length > 0){
    ExportExcel(listNumber)
  }
}


async function ExportExcel(list) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Base');

  // cabeçalho
  worksheet.addRow(['Numero']);

  list.forEach(numero => {
    worksheet.addRow([numero]);
  });

  const data = new Date();

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');

  const nomeArquivo = `${dia}-${mes}-${ano} - ${hora}h${minutos} - Base de Numeros.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
}
