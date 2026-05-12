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
| **Log de atividade** | Histórico de todas as ações do dia |
| **Admin** | Gestão de usuários, base de dados e reset diário |
| **Temas** | Dark Pro, Claro, Industrial, Oceano, Roxo |
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
│       └── itambe.png  # Logo Itambé
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
| Fontes | Manrope + Plus Jakarta Sans (Google Fonts) |
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

**v6.9.0**
