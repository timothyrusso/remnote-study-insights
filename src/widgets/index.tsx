import { declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import { collectSnapshot } from '../collect';

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerWidget('insights', WidgetLocation.RightSidebar, {
    dimensions: { height: 'auto', width: '100%' },
  });
  await plugin.app.registerCommand({
    id: 'refresh-study-insights',
    name: 'Refresh Study Insights',
    action: async () => {
      try {
        await collectSnapshot(plugin);
        await plugin.app.toast('Study Insights refreshed.');
      } catch (error) {
        await plugin.app.toast(`Study Insights: ${String(error)}`);
      }
    },
  });
  // A startup snapshot also reconciles reviews synced from other devices.
  try { await collectSnapshot(plugin); }
  catch (error) { console.error('Study Insights startup:', error); }
}

declareIndexPlugin(onActivate, async () => {});
