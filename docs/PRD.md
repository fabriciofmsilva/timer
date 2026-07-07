# PRD Timer

Vamos criar um site de timer

- Deve ser publicado no github pages
- Deve ser simples e enxuto
- Deve clicar nos minutos ou segundos e poder editar
- Deve ter um botão primário iniciar para iniciar a contagem regrassiva
  - Pode ser acionado pela barra de espaço
- Deve ter um botão secundário para zerar a contagem e voltar o tempo para o configurado inicialmente
  - Pode ser acionado com a tecla esc
- Deve disparar um som quando finalizar
- Deve manter em cache do navegador o último tempo configurado
- O timer deve ficar no meio da tela em um container de no máximo 600px
- Deve ser responsivo e funcionar em celulares
- Usar somente html, css e javascript vanila
  
## Referencias

- https://timeronline.com.br/

## Decisões de Design

Questões não cobertas no PRD original, resolvidas no SDD:

- **Botão primário é toggle:** label muda para "Pausar" enquanto contando e "Continuar" quando pausado — mesma tecla (Space) controla os três estados
- **Após 00:00:** timer congela em 00:00, botão Start desabilitado; o usuário deve pressionar Zerar (ou Esc) manualmente para voltar ao tempo configurado
- **Edição só no estado idle:** inputs ficam desabilitados enquanto o timer está rodando ou pausado; para mudar o tempo é preciso zerar primeiro
- **Título do browser:** exibe o tempo atual (`05:00 - Timer`) para permitir monitorar pelo tab
