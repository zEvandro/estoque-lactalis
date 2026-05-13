# EstoqueCD — Controle de Estoque · Câmara Fria

Sistema de gestão de estoque em tempo real para câmara fria, desenvolvido para as marcas **Batavo** e **Itambé** da Lacfrio Distribuidora.

---

## Sobre o projeto

Ferramenta de consulta de endereços e localização de produtos na câmara fria. Substitui a lista impressa em papel, agilizando a separação e conferência de paletes.

> **Importante:** Este app é uma ferramenta de apoio operacional e **não substitui o WMS Basic**. Deve ser usado sempre em conjunto com o sistema oficial da empresa.

---

## Funcionalidades

| Recurso | Descrição |
|---|---|
| **Consulta** | Busca por código, descrição ou endereço (ex: `A 001`) |
| **Vencimentos** | Alerta de produtos próximos ao vencimento (2, 5, 10, 30 dias ou personalizado) |
| **Reservas** | Reserva de paletes para separação (Aéreo) |
| **Baixas** | Registro de saída de produtos do estoque |
| **Picking** | Identificação e baixa de posições de picking |
| **Divergências** | Registro de divergências com foto, bloqueio de palete e compartilhamento via WhatsApp |
| **Log de atividade** | Histórico com filtros por ação, marca, operador e busca livre |
| **Admin** | Gestão de usuários, base de dados e reset diário |
| **Temas** | Dark Pro, Claro, Industrial, Oceano, Roxo — persistem independente da marca ativa |
| **Offline** | Cache local para consulta sem internet |

---

## Estrutura do projeto

```
Projeto Contagem/
├── index.html          # Ponto de entrada da aplicação (SPA)
├── manifest.json       # Configuração do PWA
├── sw.js               # Service Worker (cache offline)
├── assets/
│   └── images/
│       ├── Lacfrio.png # Ícone principal / splash
│       ├── batavo.png  # Logo Batavo
│       ├── itambe.png  # Logo Itambé
│       ├── logos.png   # Portfólio de marcas (landing page)
│       └── mulher.png  # Background da tela principal (desktop)
├── css/
│   └── app.css         # Estilos da aplicação (temas, componentes, layout)
└── js/
    └── app.js          # Lógica da aplicação (Firebase, UI, estado)
```

---

## Tech stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) |
| Banco de dados | Firebase Realtime Database v10.12.0 |
| Ícones | Bootstrap Icons v1.11.3 |
| Exportação | XLSX.js v0.18.5 |
| Fontes | Manrope + Plus Jakarta Sans + Dancing Script (Google Fonts) |
| PWA | Service Worker com estratégia Network-First |

---

## Perfis de acesso

| Perfil | Permissões |
|---|---|
| **ADM** | Acesso completo — base de dados, reservas, baixas, log, admin |
| **Operador** | Consulta, vencimentos e baixas da própria marca |
| **Consultor** | Somente leitura, sem cadastro necessário |

---

## Base de dados

O ADM carrega diariamente um arquivo `.xlsx` para cada marca via a aba **Base de Dados**. O sistema detecta automaticamente as colunas de:

- Código do produto
- Descrição
- Endereço (localização física)
- Caixas (quantidade)
- Data de fabricação
- Data de validade
- Lote

---

## Versão atual

**v7.2.1**

---

## Histórico de versões

| Versão | Destaques |
|---|---|
| **v7.2.1** | Corrige timing: listeners Firebase só iniciam após auth anônimo estar pronto |
| **v7.2.0** | Segurança: Auth anônimo Firebase, bloqueio após 5 tentativas, sessão reduzida para 4h, Security Rules |
| **v7.1.3** | Título do header muda conforme a base: CONTAGEM BATAVO / ITAMBÉ / GERAL |
| **v7.1.2** | Background `mulher.png` aparece em todos os tamanhos de tela |
| **v7.1.1** | Corrige bugs no sistema de temas: remove função duplicada, padroniza checkmark `✓`, simplifica inicialização |
| **v7.1.0** | Tema do usuário não é mais sobrescrito pela marca — marca aplica apenas glow sutil |
| **v7.0.1** | Conteúdo principal deslocado para a direita no desktop |
| **v7.0.0** | Background `mulher.png` na tela principal (desktop) |
| **v6.9.x** | Landing page two-column com animações typewriter, filtros no log, header com relógio e nome do operador, stats chips, cards com hover glow |
| **v6.9.0** | Versão inicial publicada |
