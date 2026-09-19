const STORAGE_KEY = "financeDashboardState";
const fallbackImage = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";

function gerarImagemPorNome(nome) {
  const termo = encodeURIComponent(nome.trim() || "produto");
  return `https://source.unsplash.com/featured/1200x900/?${termo}`;
}

function buscarImagemGoogle() {
  const nome = document.getElementById("nomeMeta").value.trim();
  const termo = encodeURIComponent(nome || "produto");
  const url = `https://www.google.com/search?q=${termo}&tbm=isch`;
  window.open(url, "_blank");
}

function lerImagemLocal(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = function () {
    document.getElementById("imagemMeta").value = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
}

function formatMoney(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor) || 0);
}

function dateToLabel(dataString) {
  const data = new Date(dataString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(data);
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function carregarEstado() {
  const json = localStorage.getItem(STORAGE_KEY);

  if (!json) {
    return {
      salarioAtual: 0,
      saldo: 0,
      metas: [],
      transacoes: []
    };
  }

  try {
    const dados = JSON.parse(json);

    const nomesDemo = ["Notebook Gamer", "Viagem para Barcelona", "Celular Premium"];
    const estadoDemo = dados.saldo === 4200
      && dados.salarioAtual === 4200
      && Array.isArray(dados.metas)
      && dados.metas.length === 3
      && dados.metas.every((meta) => nomesDemo.includes(meta.nome));

    if (estadoDemo) {
      const estadoLimpo = {
        salarioAtual: 0,
        saldo: 0,
        metas: [],
        transacoes: []
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoLimpo));
      return estadoLimpo;
    }

    return {
      salarioAtual: Number(dados.salarioAtual ?? dados.salario ?? dados.saldo) || 0,
      saldo: Number(dados.saldo) || 0,
      metas: Array.isArray(dados.metas) ? dados.metas.map((meta) => ({
        id: meta.id || gerarId(),
        nome: meta.nome || "Meta",
        valorMeta: Number(meta.valorMeta ?? meta.valor ?? 0) || 0,
        guardado: Number(meta.guardado) || 0,
        imagem: meta.imagem || fallbackImage
      })) : [],
      transacoes: Array.isArray(dados.transacoes) ? dados.transacoes : []
    };
  } catch (error) {
    console.error("Erro ao carregar o estado:", error);
    return {
      salarioAtual: 0,
      saldo: 0,
      metas: [],
      transacoes: []
    };
  }
}

function salvarEstado() {
  const storageKey = window.financeUser ? `${STORAGE_KEY}:${window.financeUser.uid}` : STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (window.saveCloudState) {
    window.saveCloudState(state).catch((error) => console.error("Erro ao sincronizar dados:", error));
  }
}

function registrarTransacao({ tipo, descricao, valor, categoria = "Outro", metaId = null, metaNome = "Conta" }) {
  state.transacoes.unshift({
    id: gerarId(),
    tipo,
    descricao,
    valor: Number(valor) || 0,
    categoria,
    metaId,
    metaNome,
    data: new Date().toISOString()
  });
}

function atualizarListaMetas() {
  const selects = [
    document.getElementById("metaSelecionada"),
    document.getElementById("metaRetirada")
  ];

  selects.forEach((select) => {
    if (!select) return;
    select.innerHTML = '<option value="">Selecione a meta</option>';

    state.metas.forEach((meta) => {
      const option = document.createElement("option");
      option.value = meta.id;
      option.textContent = meta.nome;
      select.appendChild(option);
    });
  });
}

function renderHistorico() {
  const historico = document.getElementById("historico");
  if (!historico) return;

  if (!state.transacoes.length) {
    historico.innerHTML = '<div class="historico-item"><span>Nenhuma movimentação registrada.</span></div>';
    return;
  }

  const tipoFiltro = document.getElementById("filtroTipo")?.value || "todos";
  const categoriaFiltro = document.getElementById("filtroCategoria")?.value || "todas";
  const transacoesFiltradas = state.transacoes.filter((item) => {
    const combinaTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
    const combinaCategoria = categoriaFiltro === "todas" || (item.categoria || "Outro") === categoriaFiltro;
    return combinaTipo && combinaCategoria;
  });

  if (!transacoesFiltradas.length) {
    historico.innerHTML = '<div class="historico-item"><span>Nenhuma movimentação encontrada.</span></div>';
    return;
  }

  historico.innerHTML = transacoesFiltradas
    .slice(0, 8)
    .map((item) => {
      const sinal = item.tipo === "entrada" ? "+" : "-";
      const tipoClass = item.tipo === "entrada" ? "entrada" : "saida";
      return `
        <div class="historico-item ${tipoClass}">
          <div>
            <strong>${item.descricao}</strong><br>
            <span>${item.categoria || "Outro"} • ${item.metaNome} • ${dateToLabel(item.data)}</span>
          </div>
          <strong>${sinal}${formatMoney(item.valor)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderMetas() {
  const container = document.getElementById("metas");
  const totalLabel = document.getElementById("metaTexto");

  if (!container) return;

  container.innerHTML = "";
  totalLabel.textContent = `${state.metas.length} ${state.metas.length === 1 ? "meta" : "metas"}`;

  state.metas.forEach((meta) => {
    const guardado = Number(meta.guardado) || 0;
    const objetivo = Number(meta.valorMeta) || 0;
    let percentual = objetivo > 0 ? (guardado / objetivo) * 100 : 0;
    percentual = Math.min(percentual, 100);
    const falta = Math.max(objetivo - guardado, 0);

    const card = document.createElement("article");
    card.className = "meta-card";
    card.innerHTML = `
      <img src="${meta.imagem || fallbackImage}" alt="${meta.nome}">
      <div class="meta-content">
        <h4>${meta.nome}</h4>

        <div class="meta-meta">
          <span>Guardado</span>
          <strong>${formatMoney(guardado)}</strong>
        </div>

        <div class="meta-meta">
          <span>Meta</span>
          <strong>${formatMoney(objetivo)}</strong>
        </div>

        <div class="meta-progress">
          <span style="width: ${percentual}%"></span>
        </div>

        <div class="meta-footer">
          <span>${percentual.toFixed(1)}%</span>
          <span>Falta: ${formatMoney(falta)}</span>
        </div>

        <button class="delete-btn" data-meta-id="${meta.id}">Apagar meta</button>
      </div>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll(".delete-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      const metaId = botao.dataset.metaId;
      const meta = state.metas.find((item) => item.id === metaId);
      if (!meta) return;

      const confirmar = window.confirm(`Deseja apagar a meta "${meta.nome}"?`);
      if (!confirmar) return;

      state.metas = state.metas.filter((item) => item.id !== metaId);
      registrarTransacao({
        tipo: "saida",
        descricao: `Meta removida: ${meta.nome}`,
        valor: meta.guardado,
        metaNome: meta.nome,
        metaId: meta.id
      });
      salvarEstado();
      render();
    });
  });
}

function renderSaldo() {
  const saldoDisponivel = document.getElementById("saldoDisponivel");
  const salarioAtual = document.getElementById("salarioAtual");
  const reservado = document.getElementById("reservadoTotal");
  const totalMetas = document.getElementById("metaTotal");

  if (!saldoDisponivel || !salarioAtual || !reservado || !totalMetas) return;

  const totalReservado = state.metas.reduce((acumulador, meta) => acumulador + Number(meta.guardado || 0), 0);

  saldoDisponivel.textContent = formatMoney(state.saldo);
  salarioAtual.textContent = formatMoney(state.salarioAtual);
  reservado.textContent = formatMoney(totalReservado);
  totalMetas.textContent = String(state.metas.length);
}

function render() {
  renderSaldo();
  atualizarListaMetas();
  renderMetas();
  renderHistorico();
}

function adicionarAoSaldo() {
  const valor = Number(document.getElementById("valorSaldo").value);
  if (!valor || valor <= 0) {
    alert("Informe um valor válido.");
    return;
  }

  state.saldo += valor;
  registrarTransacao({
    tipo: "entrada",
    descricao: "Adição ao saldo",
    valor,
    categoria: document.getElementById("categoriaTransacao").value,
    metaNome: "Conta"
  });
  salvarEstado();
  render();
  document.getElementById("valorSaldo").value = "";
}

function registrarSalario() {
  const valor = Number(document.getElementById("valorSalario").value);
  if (!valor || valor <= 0) {
    alert("Informe um salário válido.");
    return;
  }

  state.salarioAtual = valor;
  registrarTransacao({
    tipo: "entrada",
    descricao: "Salário atualizado",
    valor,
    categoria: "Salário",
    metaNome: "Conta"
  });

  salvarEstado();
  render();
  document.getElementById("valorSalario").value = "";
}

function retirarDoSaldo() {
  const valor = Number(document.getElementById("valorRetirarSaldo").value);
  if (!valor || valor <= 0) {
    alert("Informe um valor válido para retirar.");
    return;
  }

  if (valor > state.saldo) {
    alert("Você não pode retirar mais do que o saldo disponível.");
    return;
  }

  state.saldo -= valor;
  registrarTransacao({
    tipo: "saida",
    descricao: "Retirada para compra ou despesa",
    valor,
    categoria: document.getElementById("categoriaTransacao").value,
    metaNome: "Saldo disponível"
  });
  salvarEstado();
  render();
  document.getElementById("valorRetirarSaldo").value = "";
}

function transferirParaMeta() {
  const metaId = document.getElementById("metaSelecionada").value;
  const valor = Number(document.getElementById("valorAdicionar").value);

  if (!metaId || !valor || valor <= 0) {
    alert("Selecione uma meta e informe um valor válido.");
    return;
  }

  if (valor > state.saldo) {
    alert("Você não tem saldo suficiente para essa transferência.");
    return;
  }

  const meta = state.metas.find((item) => item.id === metaId);
  if (!meta) return;

  state.saldo -= valor;
  meta.guardado += valor;

  registrarTransacao({
    tipo: "saida",
    descricao: `Transferência para ${meta.nome}`,
    valor,
    categoria: "Meta",
    metaId: meta.id,
    metaNome: meta.nome
  });

  salvarEstado();
  render();
  document.getElementById("valorAdicionar").value = "";
  document.getElementById("metaSelecionada").value = "";
}

function retirarDaMeta() {
  const metaId = document.getElementById("metaRetirada").value;
  const valor = Number(document.getElementById("valorRemover").value);

  if (!metaId || !valor || valor <= 0) {
    alert("Selecione uma meta e informe um valor válido.");
    return;
  }

  const meta = state.metas.find((item) => item.id === metaId);
  if (!meta) return;

  if (valor > meta.guardado) {
    alert("Você não pode retirar mais do que o valor já guardado na meta.");
    return;
  }

  meta.guardado -= valor;
  state.saldo += valor;

  registrarTransacao({
    tipo: "entrada",
    descricao: `Retirada da meta ${meta.nome}`,
    valor,
    categoria: "Meta",
    metaId: meta.id,
    metaNome: meta.nome
  });

  salvarEstado();
  render();
  document.getElementById("valorRemover").value = "";
  document.getElementById("metaRetirada").value = "";
}

function criarMeta() {
  const nome = document.getElementById("nomeMeta").value.trim();
  const valorMeta = Number(document.getElementById("valorMeta").value);
  const imagem = document.getElementById("imagemMeta").value.trim();

  if (!nome || !valorMeta || valorMeta <= 0) {
    alert("Preencha nome e valor da meta corretamente.");
    return;
  }

  state.metas.push({
    id: gerarId(),
    nome,
    valorMeta,
    guardado: 0,
    imagem: imagem || gerarImagemPorNome(nome)
  });

  registrarTransacao({
    tipo: "saida",
    descricao: `Meta criada: ${nome}`,
    valor: 0,
    categoria: "Meta",
    metaId: null,
    metaNome: nome
  });

  salvarEstado();
  render();

  document.getElementById("nomeMeta").value = "";
  document.getElementById("valorMeta").value = "";
  document.getElementById("imagemMeta").value = "";
}

const state = carregarEstado();

const portfolioQrCode = document.getElementById("portfolioQrCode");
if (portfolioQrCode) {
  const portfolioUrl = new URL("portfolio.html", window.location.href).href;

  if (window.QRCode) {
    new QRCode(portfolioQrCode, {
      text: portfolioUrl,
      width: 72,
      height: 72,
      colorDark: "#172019",
      colorLight: "#d6e5cf",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    const qrFallback = document.createElement("img");
    qrFallback.src = `https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(portfolioUrl)}`;
    qrFallback.alt = "QR Code do portfólio";
    qrFallback.width = 72;
    qrFallback.height = 72;
    portfolioQrCode.appendChild(qrFallback);
  }
}

const fileImagem = document.getElementById("fileImagem");
if (fileImagem) {
  fileImagem.addEventListener("change", lerImagemLocal);

  document.getElementById("btnEscolherImagem").addEventListener("click", () => {
    fileImagem.click();
  });
}

document.getElementById("btnAdicionarSaldo").addEventListener("click", adicionarAoSaldo);
document.getElementById("btnRegistrarSalario").addEventListener("click", registrarSalario);
document.getElementById("btnRetirarSaldo").addEventListener("click", retirarDoSaldo);
document.getElementById("btnAdicionarMeta").addEventListener("click", transferirParaMeta);
document.getElementById("btnRetirarMeta").addEventListener("click", retirarDaMeta);
document.getElementById("btnCriarMeta").addEventListener("click", criarMeta);

render();
document.body.addEventListener("auth-ready", render);
document.body.addEventListener("auth-ready", async () => {
  if (!window.loadCloudState) return;

  try {
    const cloudState = await window.loadCloudState();
    const userStorageKey = `${STORAGE_KEY}:${window.financeUser.uid}`;
    const ownerKey = "financeDashboardOwner";
    const currentOwner = localStorage.getItem(ownerKey);

    if (cloudState) {
      state.salarioAtual = Number(cloudState.salarioAtual) || 0;
      state.saldo = Number(cloudState.saldo) || 0;
      state.metas = Array.isArray(cloudState.metas) ? cloudState.metas : [];
      state.transacoes = Array.isArray(cloudState.transacoes) ? cloudState.transacoes : [];
      localStorage.setItem(userStorageKey, JSON.stringify(state));
      render();
    } else {
      if (currentOwner && currentOwner !== window.financeUser.uid) {
        state.salarioAtual = 0;
        state.saldo = 0;
        state.metas = [];
        state.transacoes = [];
      } else {
        const userState = localStorage.getItem(userStorageKey);
        if (userState) {
          const dadosLocais = JSON.parse(userState);
          state.salarioAtual = Number(dadosLocais.salarioAtual) || 0;
          state.saldo = Number(dadosLocais.saldo) || 0;
          state.metas = Array.isArray(dadosLocais.metas) ? dadosLocais.metas : [];
          state.transacoes = Array.isArray(dadosLocais.transacoes) ? dadosLocais.transacoes : [];
        }
      }

      localStorage.setItem(ownerKey, window.financeUser.uid);
      salvarEstado();
      render();
    }
  } catch (error) {
    console.error("Não foi possível carregar os dados da conta:", error);
  }
});

document.getElementById("filtroTipo")?.addEventListener("change", renderHistorico);
document.getElementById("filtroCategoria")?.addEventListener("change", renderHistorico);

const corPrincipal = document.getElementById("corPrincipal");
const corDestaque = document.getElementById("corDestaque");
const btnRestaurarCores = document.getElementById("btnRestaurarCores");
const btnExportarDados = document.getElementById("btnExportarDados");
const coresPadrao = {
  primary: "#d6e5cf",
  green: "#c8e6b8"
};

function aplicarCores() {
  document.documentElement.style.setProperty("--primary", corPrincipal.value);
  document.documentElement.style.setProperty("--green", corDestaque.value);
  localStorage.setItem("financeDashboardColors", JSON.stringify({
    primary: corPrincipal.value,
    green: corDestaque.value
  }));
}

function carregarCores() {
  const coresSalvas = JSON.parse(localStorage.getItem("financeDashboardColors") || "null");
  if (!coresSalvas) return;

  corPrincipal.value = coresSalvas.primary || coresPadrao.primary;
  corDestaque.value = coresSalvas.green || coresPadrao.green;
  aplicarCores();
}

if (corPrincipal && corDestaque && btnRestaurarCores) {
  corPrincipal.addEventListener("input", aplicarCores);
  corDestaque.addEventListener("input", aplicarCores);
  btnRestaurarCores.addEventListener("click", () => {
    corPrincipal.value = coresPadrao.primary;
    corDestaque.value = coresPadrao.green;
    aplicarCores();
  });
  carregarCores();
}

if (btnExportarDados) {
  btnExportarDados.addEventListener("click", () => {
    if (!window.isAdmin) {
      alert("Apenas o administrador pode exportar os dados.");
      return;
    }

    const arquivo = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
}
