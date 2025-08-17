# 🚀 Zeno App - Sistema Inteligente de Gestão Financeira

<div align="center">

![Zeno App](https://img.shields.io/badge/Zeno-App-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![AI Powered](https://img.shields.io/badge/AI-Powered-orange?style=for-the-badge&logo=openai)

**Sistema completo de gestão financeira com OCR inteligente e assistente de IA**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Neto%20Flavio-blue?style=for-the-badge&logo=linkedin)](https://br.linkedin.com/in/antonio-flavio)
[![GitHub](https://img.shields.io/badge/GitHub-zNetinho-black?style=for-the-badge&logo=github)](https://github.com/zNetinho)

</div>

---

## 👨‍💻 Desenvolvedor

**Netinho (Neto Flavio)** - Desenvolvedor Full Stack

- 🔗 [LinkedIn](https://br.linkedin.com/in/antonio-flavio)
- 🐙 [GitHub](https://github.com/zNetinho)
- 📧 Entre em contato: [Envie um e-mail](mailto:antonio.flavio@example.com)

---

## ✨ Funcionalidades Principais

### 🤖 **OCR Inteligente com IA**
- **Extração automática de dados** de comprovantes e recibos
- **Análise de qualidade de imagem** antes do processamento
- **Categorização automática** de gastos usando IA
- **Confiança do OCR** com métricas de precisão
- **Suporte a múltiplos formatos** de comprovantes

### 💰 **Gestão Financeira Completa**
- **Registro de gastos e entradas** com interface intuitiva
- **Categorização inteligente** (Alimentação, Transporte, Moradia, Lazer, Saúde, Outros)
- **Filtros avançados** por data, categoria, valor e estabelecimento
- **Dashboard com insights** e estatísticas
- **Histórico completo** de transações

### 🎯 **Assistente de IA Integrado**
- **Processamento de linguagem natural** para entrada de dados
- **Análise contextual** de transações
- **Sugestões inteligentes** de categorização
- **Validação automática** de dados extraídos
- **Interface conversacional** para consultas

### 📱 **Interface Moderna e Responsiva**
- **Design responsivo** para desktop e mobile
- **Upload de imagens** por câmera ou arquivo
- **Drag & drop** para upload de comprovantes
- **Modo escuro** integrado
- **Componentes reutilizáveis** com shadcn/ui

---

## 🛠️ Stack Tecnológica

### **Frontend**
- **React 19** - Framework principal
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **shadcn/ui** - Componentes de interface
- **TanStack Router** - Roteamento type-safe
- **TanStack Query** - Gerenciamento de estado
- **Vite** - Build tool e dev server
- **Lucide React** - Ícones modernos

### **Backend**
- **Cloudflare Workers** - Runtime serverless
- **Deco Platform** - Framework MCP
- **Drizzle ORM** - ORM type-safe
- **SQLite** - Banco de dados
- **Zod** - Validação de schemas

### **IA e Processamento**
- **OpenAI GPT-4** - Processamento de linguagem natural
- **OCR Inteligente** - Extração de texto de imagens
- **Análise de Imagens** - Verificação de qualidade
- **Categorização Automática** - Classificação de gastos

### **DevOps e Deploy**
- **Deco CLI** - Ferramentas de desenvolvimento
- **Cloudflare Workers** - Deploy serverless
- **TypeScript** - Tipagem em todo o stack
- **ESLint/Prettier** - Qualidade de código

---

## 🚀 Como Executar

### **Pré-requisitos**
```bash
# Node.js >= 22.0.0
node --version

# Deco CLI
npm install -g deco-cli
```

### **Instalação e Configuração**
```bash
# Clone o repositório
git clone https://github.com/zNetinho/zeno-app.git
cd zeno-app

# Instale as dependências
npm install

# Configure o app
npm run configure

# Inicie o desenvolvimento
npm run dev
```

### **Comandos Disponíveis**
```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run gen          # Gera tipos para integrações externas
npm run gen:self      # Gera tipos para ferramentas próprias
npm run deploy       # Deploy para produção
npm run db:generate  # Gera migrações do banco
```

---

## 🏗️ Arquitetura do Projeto

```
zeno-app/
├── server/                 # Backend (Cloudflare Workers + Deco)
│   ├── main.ts            # Entry point do servidor
│   ├── tools.ts           # Ferramentas MCP
│   ├── tools-gast.ts      # Ferramentas de gestão financeira
│   ├── tools-user.ts      # Ferramentas de usuário
│   ├── workflows.ts       # Workflows complexos
│   ├── schema.ts          # Schema do banco de dados
│   └── deco.gen.ts        # Tipos gerados automaticamente
└── view/                  # Frontend (React + Vite)
    ├── src/
    │   ├── components/    # Componentes React
    │   ├── routes/        # Rotas da aplicação
    │   ├── hooks/         # Custom hooks
    │   └── lib/           # Utilitários e configurações
    └── package.json
```

---

## 🔧 Funcionalidades Técnicas Detalhadas

### **OCR e Processamento de Imagens**

#### **1. Verificação de Qualidade**
```typescript
// Verifica se a imagem é adequada para OCR
const qualidade = await client.VERIFICAR_QUALIDADE_IMAGEM({
  imagem_url: imageUrl
});
```

#### **2. Extração de Texto**
```typescript
// Extrai texto de comprovantes com IA
const resultado = await client.PROCESSAR_COMPROVANTE({
  imagem_url: imageUrl,
  descricao_adicional: "Informações extras"
});
```

#### **3. Análise Inteligente**
```typescript
// Analisa entrada do usuário (texto ou imagem)
const analise = await client.ANALISAR_ENTRADA({
  entrada: "Comprei pão na padaria por R$ 5,00",
  is_imagem: false,
  tipo: "gasto"
});
```

### **Gestão de Dados**

#### **1. Registro de Gastos**
```typescript
// Registra gasto com confirmação
const gasto = await client.REGISTRAR_GASTO_CONFIRMADO({
  dados: {
    tipo: "gasto",
    valor: 25.50,
    item: "Almoço",
    estabelecimento: "Restaurante",
    data: "2024-01-15",
    categoria: "Alimentação",
    forma_pagamento: "Cartão de Débito",
    confianca_ocr: 0.95
  }
});
```

#### **2. Consulta e Filtros**
```typescript
// Lista gastos com filtros avançados
const gastos = await client.LISTAR_GASTOS({
  filtros: {
    categoria: "Alimentação",
    data_inicio: "2024-01-01",
    data_fim: "2024-01-31",
    valor_min: 10,
    valor_max: 100
  }
});
```

### **Assistente de IA**

#### **1. Categorização Automática**
```typescript
// Categoriza gastos automaticamente
const categorias = await client.CATEGORIZAR_GASTOS({
  gastos: listaDeGastos
});
```

#### **2. Geração de Insights**
```typescript
// Gera insights sobre gastos
const insights = await client.GERAR_INSIGHTS({
  dados: dadosFinanceiros
});
```

---

## 🎨 Interface do Usuário

### **Componentes Principais**

- **GastoModal** - Modal para registro de gastos com OCR
- **ImageUpload** - Upload de imagens com câmera e drag & drop
- **GastosList** - Lista de gastos com filtros
- **GastosFilters** - Filtros avançados
- **ChatWidget** - Assistente conversacional
- **WorkflowSelector** - Seleção de workflows

### **Funcionalidades da Interface**

- ✅ **Upload múltiplo** de comprovantes
- ✅ **Preview de imagens** antes do processamento
- ✅ **Confirmação de dados** extraídos
- ✅ **Edição inline** de registros
- ✅ **Filtros em tempo real**
- ✅ **Responsividade completa**

---

## 🔒 Segurança e Autenticação

- **Autenticação OAuth** via Deco Platform
- **Validação de schemas** com Zod
- **Sanitização de dados** de entrada
- **Controle de acesso** por usuário
- **Logs de auditoria** para transações

---

## 📊 Banco de Dados

### **Schema Principal**
```sql
CREATE TABLE gastos (
  id INTEGER PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'gasto',
  valor REAL NOT NULL,
  item TEXT NOT NULL,
  quantidade INTEGER DEFAULT 1,
  estabelecimento TEXT NOT NULL,
  data TEXT NOT NULL,
  categoria TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL,
  tags TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Migrações Automáticas**
- Migrações geradas automaticamente com Drizzle
- Aplicação lazy no runtime
- Versionamento de schema

---

## 🚀 Deploy e Produção

### **Cloudflare Workers**
- Deploy serverless automático
- Edge computing global
- Performance otimizada
- Escalabilidade automática

### **Monitoramento**
- Logs em tempo real
- Métricas de performance
- Alertas de erro
- Analytics de uso

---

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Agradecimentos

- **Deco Platform** - Framework MCP
- **OpenAI** - Modelos de IA
- **Cloudflare** - Infraestrutura serverless
- **shadcn/ui** - Componentes de interface
- **Comunidade open source** - Ferramentas e bibliotecas

---

<div align="center">

**Desenvolvido com ❤️ por [Netinho](https://github.com/zNetinho)**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://br.linkedin.com/in/antonio-flavio)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?style=for-the-badge&logo=github)](https://github.com/zNetinho)

</div>
