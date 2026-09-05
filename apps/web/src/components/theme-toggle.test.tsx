import { fireEvent, render, screen } from '@testing-library/react';

import { THEME_STORAGE_KEY, ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('arranca en automático cuando no hay preferencia guardada', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: /Tema: automático/ })).toBeVisible();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('recorre automático, claro y oscuro, y vuelve al principio', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole('button');

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    // Volver a automático retira el atributo para que mande el sistema.
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('respeta la preferencia ya guardada', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: /Tema: oscuro/ })).toBeVisible();
  });

  it('ignora un valor corrupto en el almacenamiento', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neón');

    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: /Tema: automático/ })).toBeVisible();
  });

  it('sigue funcionando si el navegador bloquea el almacenamiento', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado');
    });

    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.theme).toBe('light');
    setItem.mockRestore();
  });
});
