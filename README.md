# Controle de Estacionamento - Rincon Security

<p align="center">
  <img src="/public/images/rincon-logo.png" alt="Rincon Security Logo" width="200"/>
</p>

## Descrição

O Controle de Estacionamento é uma aplicação web desenvolvida para a Rincon Security, projetada para gerenciar e monitorar veículos em um estacionamento. Desenvolvida com React e TypeScript, a aplicação oferece uma interface moderna e intuitiva para o registro de entrada e saída de veículos, geração de relatórios e monitoramento em tempo real.

## Funcionalidades

- **Registro de Entrada/Saída**: Cadastro completo de veículos com informações como placa, modelo, cor, responsável e TAG
- **Formatação Automática**: Formatação automática da placa do veículo (AAA-0000) e numeração sequencial de TAGs
- **Monitoramento em Tempo Real**: Visualização rápida de veículos dentro do estacionamento e histórico de saídas
- **Indicadores Visuais**: Painéis informativos mostrando total de veículos hoje, veículos dentro e veículos que saíram
- **Relatórios Personalizados**: Geração de relatórios em formato Excel por período, dia atual ou status
- **Pesquisa Avançada**: Busca rápida por placa, modelo ou responsável
- **Interface Responsiva**: Design adaptável para diferentes dispositivos
- **Navegação por Teclado**: Suporte à navegação entre campos usando a tecla Enter

## Tecnologias Utilizadas

- **React**: Biblioteca JavaScript para construção da interface
- **TypeScript**: Superset tipado de JavaScript
- **CSS Moderno**: Flexbox e Grid para layouts responsivos
- **Material-UI Icons**: Conjunto de ícones para melhorar a experiência visual
- **SessionStorage**: Armazenamento local para persistência de dados

## Como Executar

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/parking-control.git
   cd parking-control
   ```

2. Instale as dependências:
   ```
   npm install
   # ou
   yarn install
   ```

3. Execute a aplicação:
   ```
   npm start
   # ou
   yarn start
   ```

4. Acesse a aplicação em seu navegador:
   ```
   http://localhost:3000
   ```

## Implantação

Para implantar a aplicação em produção:

1. Crie uma versão otimizada:
   ```
   npm run build
   # ou
   yarn build
   ```

2. O diretório `build` gerado pode ser implantado em qualquer servidor web estático como Netlify, Vercel, GitHub Pages, etc.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Autor

Desenvolvido para Rincon Security.

---

<p align="center">
  <i>Controle de Estacionamento - Solução profissional para gestão de veículos</i>
</p>
