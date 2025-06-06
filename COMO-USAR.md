# 🚀 Como Usar o OrdEasy

## 🔧 Configuração Inicial

1. **Clone o projeto** e instale as dependências:
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure o Firebase:**
   - Acesse: https://console.firebase.google.com
   - Selecione seu projeto: `ordeasy-c247a`
   - Vá em Realtime Database
   - Importe o arquivo `firebase-import-data.json`

3. **Execute o projeto:**
   \`\`\`bash
   npm run dev
   \`\`\`

## 📱 Fluxo de Uso

### Para Clientes:
1. **Escaneie o QR Code** da mesa
2. **Navegue pelo cardápio** digital
3. **Adicione itens** ao carrinho
4. **Finalize o pedido** informando a mesa

### Para Restaurantes:
1. **Acesse `/dashboard`**
2. **Visualize pedidos** em tempo real
3. **Atualize status** dos pedidos
4. **Gerencie estatísticas** e relatórios

## 🎯 URLs Importantes

- **Home:** `/` - Landing page
- **Dashboard:** `/dashboard` - Painel administrativo
- **Demo:** `/demo/restaurante-exemplo` - Teste o sistema
- **Cardápio:** `/restaurante-exemplo?mesa=X` - Interface do cliente

## 🔄 Status dos Pedidos

- **Pending:** Pedido recebido
- **Confirmed:** Pedido confirmado
- **Preparing:** Em preparação
- **Ready:** Pronto para entrega
- **Delivered:** Entregue
- **Cancelled:** Cancelado

## 📊 Funcionalidades

✅ **Realtime Updates** - Atualizações instantâneas
✅ **Responsive Design** - Funciona em todos dispositivos
✅ **Status Management** - Controle completo de pedidos
✅ **Statistics Dashboard** - Relatórios em tempo real
✅ **Multi-Category Menu** - Cardápio organizado
✅ **Cart Management** - Carrinho inteligente

## 🛠 Próximos Passos

1. **Autenticação** - Sistema de login
2. **Pagamentos** - Gateway de pagamento
3. **Notificações** - Push notifications
4. **Multi-tenant** - Múltiplos restaurantes
5. **Analytics** - Relatórios avançados
