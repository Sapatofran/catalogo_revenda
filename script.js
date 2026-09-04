/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9z1CuENYFCsV0wSkhPhlWCXXRnQc25xK14fm6ih9hQfaU3kh02bxNq7UIPO22KPXELLb2IFsQP6lG/pub?gid=0&single=true&output=csv";


/*
    Atualização automática.

    30000 = 30 segundos
*/

const TEMPO_ATUALIZACAO = 30000;


/* =====================================================
   ELEMENTOS
===================================================== */

const productGrid =
    document.getElementById("productGrid");

const status =
    document.getElementById("status");

const resultsCount =
    document.getElementById("resultsCount");

const emptyState =
    document.getElementById("emptyState");


const searchFilter =
    document.getElementById("searchFilter");

const categoryFilter =
    document.getElementById("categoryFilter");

const variationFilter =
    document.getElementById("variationFilter");

const availabilityFilter =
    document.getElementById("availabilityFilter");

const sortFilter =
    document.getElementById("sortFilter");

const clearFilters =
    document.getElementById("clearFilters");

const emptyClearFilters =
    document.getElementById("emptyClearFilters");


/* =====================================================
   MODAL
===================================================== */

const modalOverlay =
    document.getElementById("modalOverlay");

const modalClose =
    document.getElementById("modalClose");

const modalAction =
    document.getElementById("modalAction");

const modalImage =
    document.getElementById("modalImage");

const modalTitle =
    document.getElementById("modalTitle");

const modalCategory =
    document.getElementById("modalCategory");

const modalSku =
    document.getElementById("modalSku");

const modalVariation =
    document.getElementById("modalVariation");

const modalGrade =
    document.getElementById("modalGrade");

const modalAvailability =
    document.getElementById("modalAvailability");

const modalPrice =
    document.getElementById("modalPrice");


/* =====================================================
   DADOS
===================================================== */

let produtos = [];

let produtosFiltrados = [];


/* =====================================================
   PARSER CSV
=====================================================

   Esta função é importante porque o CSV do Google
   pode conter vírgulas dentro dos próprios campos.

===================================================== */

function parseCSV(texto) {

    const linhas = [];

    let linhaAtual = [];

    let campoAtual = "";

    let dentroDeAspas = false;


    for (let i = 0; i < texto.length; i++) {

        const caractere = texto[i];

        const proximo = texto[i + 1];


        // Aspas

        if (
            caractere === '"' &&
            dentroDeAspas &&
            proximo === '"'
        ) {

            campoAtual += '"';

            i++;

            continue;
        }


        if (caractere === '"') {

            dentroDeAspas =
                !dentroDeAspas;

            continue;
        }


        // Vírgula

        if (
            caractere === "," &&
            !dentroDeAspas
        ) {

            linhaAtual.push(
                campoAtual
            );

            campoAtual = "";

            continue;
        }


        // Quebra de linha

        if (
            (
                caractere === "\n" ||
                caractere === "\r"
            ) &&
            !dentroDeAspas
        ) {

            if (
                caractere === "\r" &&
                proximo === "\n"
            ) {

                i++;

            }


            linhaAtual.push(
                campoAtual
            );

            campoAtual = "";


            if (
                linhaAtual.some(
                    campo => campo.trim() !== ""
                )
            ) {

                linhas.push(
                    linhaAtual
                );

            }


            linhaAtual = [];

            continue;
        }


        campoAtual += caractere;

    }


    // Último campo

    if (
        campoAtual !== "" ||
        linhaAtual.length > 0
    ) {

        linhaAtual.push(
            campoAtual
        );


        if (
            linhaAtual.some(
                campo => campo.trim() !== ""
            )
        ) {

            linhas.push(
                linhaAtual
            );

        }

    }


    return linhas;

}


/* =====================================================
   LIMPAR TEXTO
===================================================== */

function limparTexto(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return valor
        .toString()
        .trim();

}


/* =====================================================
   FORMATAR PREÇO
===================================================== */

function formatarPreco(valor) {

    if (!valor) {

        return "";

    }


    let texto =
        valor
            .toString()
            .replace("R$", "")
            .trim();


    /*
        Se tiver vírgula:

        99,90
        1.299,90

        transforma para:

        99.90
        1299.90
    */

    if (texto.includes(",")) {

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");

    }


    const numero =
        parseFloat(texto);


    if (isNaN(numero)) {

        return valor;

    }


    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


/* =====================================================
   CONVERTER PREÇO PARA NÚMERO
===================================================== */

function precoNumerico(valor) {

    if (!valor) {

        return 0;

    }


    let texto =
        valor
            .toString()
            .replace("R$", "")
            .trim();


    if (texto.includes(",")) {

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");

    }


    const numero =
        parseFloat(texto);


    return isNaN(numero)
        ? 0
        : numero;

}


/* =====================================================
   NORMALIZAR DISPONIBILIDADE
===================================================== */

function estaDisponivel(valor) {

    return (
        limparTexto(valor)
            .toLowerCase() === "sim"
    );

}


/* =====================================================
   ESCAPAR HTML
=====================================================

   Evita que caracteres da planilha sejam interpretados
   como HTML.

===================================================== */

function escaparHTML(valor) {

    return limparTexto(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   GOOGLE DRIVE — CONVERTER LINK DA IMAGEM
=====================================================

   O analista poderá colocar na planilha o link normal
   que o Google Drive fornece ao compartilhar a imagem.

   Exemplos aceitos:

   https://drive.google.com/file/d/ID/view

   https://drive.google.com/open?id=ID

   https://drive.google.com/uc?id=ID

   O código identifica o ID automaticamente.

   Se não for um link do Drive, mantém a URL original.

===================================================== */

function converterImagemDrive(url) {
    if (!url) return "";

    const texto = limparTexto(url);

    let idArquivo = null;

    // Link padrão:
    // https://drive.google.com/file/d/ID/view
    const matchArquivo = texto.match(
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
    );

    if (matchArquivo) {
        idArquivo = matchArquivo[1];
    }

    // Links que já possuem ?id=ID
    if (!idArquivo) {
        const matchId = texto.match(
            /[?&]id=([a-zA-Z0-9_-]+)/
        );

        if (matchId) {
            idArquivo = matchId[1];
        }
    }

    // Se encontrou um ID do Google Drive,
    // usa o endpoint de thumbnail.
    if (idArquivo) {
        return `https://drive.google.com/thumbnail?id=${idArquivo}&sz=w1200`;
    }

    // Se não for Drive, mantém a URL original.
    return texto;
}


/* =====================================================
   CARREGAR PRODUTOS
===================================================== */

async function carregarProdutos() {

    try {

        status.innerHTML = `
            <span class="loading-spinner"></span>
            Atualizando catálogo...
        `;


        const resposta =
            await fetch(
                URL + "&t=" + Date.now()
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao acessar a planilha."
            );

        }


        const texto =
            await resposta.text();


        const linhas =
            parseCSV(texto);


        if (
            !linhas ||
            linhas.length < 2
        ) {

            throw new Error(
                "A planilha não possui produtos."
            );

        }


        /*
            Primeira linha = cabeçalho

            Colunas:

            0 Produto
            1 SKU
            2 Disponibilidade
            3 Variação
            4 Grade
            5 Imagem
            6 Preço
            7 Categoria
        */

        produtos =
            linhas
                .slice(1)
                .map(colunas => {

                    return {

                        produto:
                            limparTexto(
                                colunas[0]
                            ),

                        sku:
                            limparTexto(
                                colunas[1]
                            ),

                        disponibilidade:
                            limparTexto(
                                colunas[2]
                            ),

                        variacao:
                            limparTexto(
                                colunas[3]
                            ),

                        grade:
                            limparTexto(
                                colunas[4]
                            ),

                        /*
                            AQUI está a mudança:

                            Se for Google Drive,
                            converte automaticamente.

                            Se for uma URL normal,
                            mantém como está.
                        */

                        imagem:
                            converterImagemDrive(
                                colunas[5]
                            ),

                        preco:
                            limparTexto(
                                colunas[6]
                            ),

                        categoria:
                            limparTexto(
                                colunas[7]
                            )

                    };

                })
                .filter(
                    produto =>
                        produto.produto !== ""
                );


        preencherFiltros();


        aplicarFiltros();


        status.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            Catálogo atualizado agora.
        `;


    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        );


        status.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            Não foi possível atualizar o catálogo.
        `;


        if (!produtos.length) {

            resultsCount.textContent =
                "Erro ao carregar produtos.";

        }

    }

}


/* =====================================================
   PREENCHER FILTROS DINAMICAMENTE
===================================================== */

function preencherFiltros() {

    const categoriaAtual =
        categoryFilter.value;

    const variacaoAtual =
        variationFilter.value;


    /*
        CATEGORIAS
    */

    const categorias =
        [...new Set(
            produtos
                .map(produto =>
                    produto.categoria
                )
                .filter(Boolean)
        )]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );


    categoryFilter.innerHTML = `
        <option value="">
            Todas
        </option>
    `;


    categorias.forEach(
        categoria => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                categoria;


            option.textContent =
                categoria;


            categoryFilter.appendChild(
                option
            );

        }
    );


    /*
        VARIAÇÕES / CORES
    */

    const variacoes =
        [...new Set(
            produtos
                .map(produto =>
                    produto.variacao
                )
                .filter(Boolean)
        )]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );


    variationFilter.innerHTML = `
        <option value="">
            Todas
        </option>
    `;


    variacoes.forEach(
        variacao => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                variacao;


            option.textContent =
                variacao;


            variationFilter.appendChild(
                option
            );

        }
    );


    /*
        Tenta manter o filtro selecionado
    */

    if (
        categorias.includes(
            categoriaAtual
        )
    ) {

        categoryFilter.value =
            categoriaAtual;

    }


    if (
        variacoes.includes(
            variacaoAtual
        )
    ) {

        variationFilter.value =
            variacaoAtual;

    }

}


/* =====================================================
   APLICAR FILTROS
===================================================== */

function aplicarFiltros() {

    const busca =
        limparTexto(
            searchFilter.value
        ).toLowerCase();


    const categoria =
        categoryFilter.value;


    const variacao =
        variationFilter.value;


    const disponibilidade =
        availabilityFilter.value;


    produtosFiltrados =
        produtos.filter(
            produto => {


                /*
                    BUSCA
                */

                const correspondeBusca =
                    !busca ||
                    produto.produto
                        .toLowerCase()
                        .includes(busca) ||
                    produto.sku
                        .toLowerCase()
                        .includes(busca);


                /*
                    CATEGORIA
                */

                const correspondeCategoria =
                    !categoria ||
                    produto.categoria ===
                    categoria;


                /*
                    VARIAÇÃO
                */

                const correspondeVariacao =
                    !variacao ||
                    produto.variacao ===
                    variacao;


                /*
                    DISPONIBILIDADE
                */

                const disponivel =
                    estaDisponivel(
                        produto.disponibilidade
                    );


                const correspondeDisponibilidade =
                    !disponibilidade ||

                    (
                        disponibilidade === "sim" &&
                        disponivel
                    ) ||

                    (
                        disponibilidade === "nao" &&
                        !disponivel
                    );


                return (
                    correspondeBusca &&
                    correspondeCategoria &&
                    correspondeVariacao &&
                    correspondeDisponibilidade
                );

            }
        );


    ordenarProdutos();


    renderizarProdutos();

}


/* =====================================================
   ORDENAR
===================================================== */

function ordenarProdutos() {

    const ordem =
        sortFilter.value;


    if (
        ordem === "menor-preco"
    ) {

        produtosFiltrados.sort(
            (a, b) =>
                precoNumerico(a.preco) -
                precoNumerico(b.preco)
        );

        return;

    }


    if (
        ordem === "maior-preco"
    ) {

        produtosFiltrados.sort(
            (a, b) =>
                precoNumerico(b.preco) -
                precoNumerico(a.preco)
        );

        return;

    }


    /*
        Padrão = nome
    */

    produtosFiltrados.sort(
        (a, b) =>
            a.produto.localeCompare(
                b.produto,
                "pt-BR"
            )
    );

}


/* =====================================================
   RENDERIZAR PRODUTOS
===================================================== */

function renderizarProdutos() {

    productGrid.innerHTML = "";


    resultsCount.textContent =
        `${produtosFiltrados.length} ${
            produtosFiltrados.length === 1
                ? "produto encontrado"
                : "produtos encontrados"
        }`;


    if (
        produtosFiltrados.length === 0
    ) {

        emptyState.style.display =
            "block";

        return;

    }


    emptyState.style.display =
        "none";


    produtosFiltrados.forEach(
        (produto, index) => {

            const disponivel =
                estaDisponivel(
                    produto.disponibilidade
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "card";


            /*
                A URL já foi convertida para Drive
                durante o carregamento da planilha.
            */

            const imagem =
                escaparHTML(
                    produto.imagem
                );


            const imagemFinal =
                imagem ||
                "https://placehold.co/800x800/F7F5F2/4A4A4A?text=Sem+imagem";


            card.innerHTML = `

                <div class="card-media">

                    <img
                        src="${imagemFinal}"
                        alt="${escaparHTML(produto.produto)}"
                        loading="lazy"
                        onerror="
                            this.src='https://placehold.co/800x800/F7F5F2/4A4A4A?text=Sem+imagem'
                        "
                    >

                    ${
                        produto.categoria
                            ? `
                                <span class="card-badge">
                                    ${escaparHTML(
                                        produto.categoria
                                    )}
                                </span>
                            `
                            : ""
                    }

                </div>


                <div class="card-body">


                    <div class="card-tags">

                        ${
                            produto.categoria
                                ? `
                                    <span class="tag">
                                        ${escaparHTML(
                                            produto.categoria
                                        )}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            produto.variacao
                                ? `
                                    <span class="tag tag-line">
                                        ${escaparHTML(
                                            produto.variacao
                                        )}
                                    </span>
                                `
                                : ""
                        }

                    </div>


                    <h3>
                        ${escaparHTML(
                            produto.produto
                        )}
                    </h3>


                    ${
                        produto.sku
                            ? `
                                <div class="card-sku">
                                    SKU: ${escaparHTML(
                                        produto.sku
                                    )}
                                </div>
                            `
                            : ""
                    }


                    <div class="card-details">


                        ${
                            produto.variacao
                                ? `
                                    <div class="card-detail">

                                        <span>
                                            Cor
                                        </span>

                                        <strong>
                                            ${escaparHTML(
                                                produto.variacao
                                            )}
                                        </strong>

                                    </div>
                                `
                                : ""
                        }


                        ${
                            produto.grade
                                ? `
                                    <div class="card-detail">

                                        <span>
                                            Numeração
                                        </span>

                                        <strong>
                                            ${escaparHTML(
                                                produto.grade
                                            )}
                                        </strong>

                                    </div>
                                `
                                : ""
                        }

                    </div>


                    <div class="card-price">

                        <span>
                            Preço
                        </span>

                        <strong>
                            ${formatarPreco(
                                produto.preco
                            )}
                        </strong>

                    </div>


                    <div class="
                        card-availability
                        ${
                            disponivel
                                ? "available"
                                : "unavailable"
                        }
                    ">

                        <span class="availability-dot"></span>

                        ${
                            disponivel
                                ? "Disponível"
                                : "Indisponível"
                        }

                    </div>


                    <button
                        type="button"
                        class="card-button"
                        data-index="${index}"
                    >

                        Ver detalhes

                        <i class="fa-solid fa-arrow-right"></i>

                    </button>

                </div>

            `;


            productGrid.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   ABRIR MODAL
===================================================== */

function abrirModal(produto) {

    const disponivel =
        estaDisponivel(
            produto.disponibilidade
        );


    /*
        IMPORTANTE:
        produto.imagem já está convertida
        caso seja um link do Google Drive.
    */

    modalImage.src =
        produto.imagem ||
        "https://placehold.co/800x800/F7F5F2/4A4A4A?text=Sem+imagem";


    modalImage.alt =
        produto.produto;


    modalTitle.textContent =
        produto.produto;


    modalCategory.textContent =
        produto.categoria ||
        "Produto";


    modalSku.textContent =
        produto.sku ||
        "Não informado";


    modalVariation.textContent =
        produto.variacao ||
        "Não informado";


    modalGrade.textContent =
        produto.grade ||
        "Não informado";


    modalAvailability.textContent =
        disponivel
            ? "Disponível"
            : "Indisponível";


    modalAvailability.style.color =
        disponivel
            ? "var(--verde)"
            : "var(--vermelho-vivo)";


    modalPrice.textContent =
        formatarPreco(
            produto.preco
        );


    modalOverlay.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";


    modalClose.focus();

}


/* =====================================================
   FECHAR MODAL
===================================================== */

function fecharModal() {

    modalOverlay.classList.remove(
        "open"
    );


    document.body.style.overflow =
        "";

}


/* =====================================================
   EVENTO DOS CARDS
===================================================== */

productGrid.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".card-button"
            );


        if (!button) {

            return;

        }


        const index =
            Number(
                button.dataset.index
            );


        const produto =
            produtosFiltrados[index];


        if (produto) {

            abrirModal(
                produto
            );

        }

    }
);


/* =====================================================
   EVENTOS DOS FILTROS
===================================================== */

searchFilter.addEventListener(
    "input",
    aplicarFiltros
);


categoryFilter.addEventListener(
    "change",
    aplicarFiltros
);


variationFilter.addEventListener(
    "change",
    aplicarFiltros
);


availabilityFilter.addEventListener(
    "change",
    aplicarFiltros
);


sortFilter.addEventListener(
    "change",
    aplicarFiltros
);


/* =====================================================
   LIMPAR FILTROS
===================================================== */

function limparFiltros() {

    searchFilter.value = "";

    categoryFilter.value = "";

    variationFilter.value = "";

    availabilityFilter.value = "";

    sortFilter.value = "nome";


    aplicarFiltros();

}


clearFilters.addEventListener(
    "click",
    limparFiltros
);


emptyClearFilters.addEventListener(
    "click",
    limparFiltros
);


/* =====================================================
   MODAL
===================================================== */

modalClose.addEventListener(
    "click",
    fecharModal
);


modalAction.addEventListener(
    "click",
    fecharModal
);


modalOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            modalOverlay
        ) {

            fecharModal();

        }

    }
);


/* =====================================================
   ESC PARA FECHAR MODAL
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            modalOverlay.classList.contains(
                "open"
            )
        ) {

            fecharModal();

        }

    }
);


/* =====================================================
   ANO DO FOOTER
===================================================== */

document.getElementById(
    "year"
).textContent =
    new Date().getFullYear();


/* =====================================================
   PRIMEIRA CARGA
===================================================== */

carregarProdutos();


/* =====================================================
   ATUALIZAÇÃO AUTOMÁTICA
===================================================== */

setInterval(
    carregarProdutos,
    TEMPO_ATUALIZACAO
);