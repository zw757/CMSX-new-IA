import { createSettingsSession } from './course-settings-state.mjs';

const storage = { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) };
export const settingsSession = createSettingsSession(storage, { example: new URLSearchParams(location.search).get('example') === 'filled' });
export const readDraftStaff = () => settingsSession.current().staff;
export const stageDraftStaff = record => settingsSession.stageStaff(record);
