const { ipcRenderer, shell } = require('electron');
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
  tabela.border = '1';

  // Cabeçalho
  const cabecalho = tabela.insertRow();
  Object.keys(dados[0]).forEach(coluna => {
    const th = document.createElement('th');
    th.innerText = coluna;
    cabecalho.appendChild(th);
  });

  // Linhas
  dados.forEach(linha => {
    const tr = tabela.insertRow();
    Object.values(linha).forEach(valor => {
      const td = tr.insertCell();
      td.innerText = valor;
    });
  });

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
        stepMaster(2)
      }, 2000);
    }

  } catch (err) {
    console.error('Erro durante o login:', err.message);
  }
});

// ENVIAR MENSAGENS PARA WHATSAPP - COM OPERADORES DE [] E {}
document.getElementById('meuBotao').addEventListener('click', () => {
  if (!dadosDaPlanilha || dadosDaPlanilha.length === 0) {
    alert('Por favor, selecione uma planilha primeiro!');
    return;
  }

  const modeloMensagem = document.getElementById('textarea').value;

  const lista = dadosDaPlanilha.map(item => {
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
      } catch (e) {
        return `{Erro: {[${variavel}] ${operador} ${outroValor}}}`;
      }
    });

    mensagemFinal = mensagemFinal.replace(/\{([^{}]+)\}/g, (_, expressao) => {
      try {
        const resultado = Function(`"use strict"; return (${expressao})`)();
        return resultado;
      } catch (e) {
        return `{Erro: ${expressao}}`;
      }
    });

    return {
      numero: String(item.Numero || item.numero || item.tefefone || item.Telefone || item.contato || item.Contato),
      mensagem: mensagemFinal
    };
  });

  const barra = document.getElementById('barra-progresso');
  const container = document.getElementById('progresso-container');
  const mensagemFinal = document.getElementById('mensagem-final');
  container.style.display = 'block';
  barra.style.width = '0%';
  mensagemFinal.innerText = '';

  let total = lista.length;
  let enviados = 0;

  const enviarProximo = () => {
    if (enviados >= total) {
      mensagemFinal.innerText = '✅ Todos os envios foram concluídos!';
      return;
    }

    const item = lista[enviados];
    // ipcRenderer.send('enviar-lista', [item]);
    console.log(JSON.stringify(item));

    enviados++;
    let porcentagem = Math.round((enviados / total) * 100);
    barra.style.width = porcentagem + '%';

    setTimeout(enviarProximo, 800);
  };

  enviarProximo();
});



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
  document.getElementById('fotoUsuario').src = dados.foto;

  // const ul = document.getElementById('listaGrupos');
  // ul.innerHTML = '';
  // dados.grupos.forEach(grupo => {
  //   const li = document.createElement('li');
  //   li.innerText = `${grupo.nome} (${grupo.participantes} membros)`;
  //   ul.appendChild(li);
  // });

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


document.querySelectorAll("#linkProfile").addEventListener('click', (e) => {
  e.preventDefault();
  shell.openExternal('https://www.linkedin.com/in/luiseduardo-andrade/');
})

// document.getElementById('meuBotao').addEventListener('click', () => {

