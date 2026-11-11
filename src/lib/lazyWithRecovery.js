import { lazy } from 'react';

const retryKey = 'module-import-retry';
const isModuleImportError = error => /module script|dynamically imported module|failed to fetch/i.test(String(error?.message || error));

export default function lazyWithRecovery(load) {
  return lazy(async () => {
    try {
      const module = await load();
      sessionStorage.removeItem(retryKey);
      return module;
    } catch (error) {
      if (isModuleImportError(error) && !sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(retryKey);
      throw error;
    }
  });
}