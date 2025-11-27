// index.js — wires toolbar icon to open the panel
(async function() {
  console.log("[Find & Replace] init script starting");
  await miro.board.ui.on('icon:click', async () => {
    console.log("[Find & Replace] Toolbar icon clicked — opening panel");
    await miro.board.ui.openPanel({ url: 'panel.html' });
  });
  console.log("[Find & Replace] icon:click handler registered");
})();
