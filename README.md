# Parking Control

Sistema de controle de estacionamento com sincronização em tempo real.

## Funcionalidades

- Registro de entrada de veículos
- Controle de saída
- Busca por placa, modelo ou responsável
- Relatórios personalizados
- Exportação para Excel
- Sincronização em tempo real entre dispositivos
- Persistência na nuvem com Firebase

## Tecnologias

- React
- TypeScript
- Material-UI
- Firebase/Firestore
- Netlify (deploy)

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```
3. Configure o Firebase:
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
   - Ative o Firestore Database
   - Configure as regras de segurança
   - Copie as credenciais para `src/firebase.ts`

4. Inicie o servidor de desenvolvimento:
```bash
npm start
```

## Deploy

O projeto está configurado para deploy na Netlify. Para fazer o deploy:

1. Faça login na Netlify
2. Conecte com o repositório GitHub
3. Configure as variáveis de ambiente se necessário
4. Deploy!
