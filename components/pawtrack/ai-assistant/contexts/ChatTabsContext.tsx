"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Patient } from "@/components/pawtrack/appointments/hooks/use-patient-search";

export interface ChatTab {
  id: string;
  patient: Patient;
  isActive: boolean;
}

interface ChatTabsContextValue {
  tabs: ChatTab[];
  activeTabId: string | null;
  addTab: (patient: Patient) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  getActiveTab: () => ChatTab | null;
  getTabByPatientId: (patientId: string) => ChatTab | null;
}

const ChatTabsContext = createContext<ChatTabsContextValue | undefined>(undefined);

const STORAGE_KEY_TABS = 'chat-tabs';
const STORAGE_KEY_ACTIVE_TAB = 'chat-active-tab-id';

function loadTabsFromStorage(): ChatTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TABS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // Error handled silently
  }
  return [];
}

function saveTabsToStorage(tabs: ChatTab[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
  } catch (error) {
    // Error handled silently
  }
}

function loadActiveTabIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
  } catch (error) {
    return null;
  }
}

function saveActiveTabIdToStorage(activeTabId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (activeTabId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
    }
  } catch (error) {
    // Error handled silently
  }
}

export function ChatTabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<ChatTab[]>(() => loadTabsFromStorage());
  const [activeTabId, setActiveTabId] = useState<string | null>(() => loadActiveTabIdFromStorage());

  const addTab = useCallback((patient: Patient): string => {
    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((tab) => tab.patient.id === patient.id);
      if (existingTab) {
        const newActiveId = existingTab.id;
        setActiveTabId(newActiveId);
        saveActiveTabIdToStorage(newActiveId);
        const updatedTabs = prevTabs.map((tab) => ({
          ...tab,
          isActive: tab.id === existingTab.id,
        }));
        saveTabsToStorage(updatedTabs);
        return updatedTabs;
      }

      const newTabId = `tab-${patient.id}-${Date.now()}`;
      const newTab: ChatTab = {
        id: newTabId,
        patient,
        isActive: true,
      };

      const updatedTabs = prevTabs.map((tab) => ({ ...tab, isActive: false }));
      updatedTabs.push(newTab);

      setActiveTabId(newTabId);
      saveActiveTabIdToStorage(newTabId);
      saveTabsToStorage(updatedTabs);
      return updatedTabs;
    });

    return `tab-${patient.id}-${Date.now()}`;
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const filtered = prevTabs.filter((tab) => tab.id !== tabId);
      
      if (activeTabId === tabId) {
        if (filtered.length > 0) {
          const lastTab = filtered[filtered.length - 1];
          const newActiveId = lastTab.id;
          setActiveTabId(newActiveId);
          saveActiveTabIdToStorage(newActiveId);
          const updatedTabs = filtered.map((tab) => ({
            ...tab,
            isActive: tab.id === newActiveId,
          }));
          saveTabsToStorage(updatedTabs);
          return updatedTabs;
        } else {
          setActiveTabId(null);
          saveActiveTabIdToStorage(null);
          saveTabsToStorage([]);
          return [];
        }
      }
      
      const updatedTabs = filtered.map((tab) => ({
        ...tab,
        isActive: tab.id === activeTabId,
      }));
      saveTabsToStorage(updatedTabs);
      return updatedTabs;
    });
  }, [activeTabId, setActiveTabId]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    saveActiveTabIdToStorage(tabId);
    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
      }));
      saveTabsToStorage(updatedTabs);
      return updatedTabs;
    });
  }, []);

  const getActiveTab = useCallback((): ChatTab | null => {
    return tabs.find((tab) => tab.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  const getTabByPatientId = useCallback((patientId: string): ChatTab | null => {
    return tabs.find((tab) => tab.patient.id === patientId) || null;
  }, [tabs]);

  return (
    <ChatTabsContext.Provider
      value={{
        tabs,
        activeTabId,
        addTab,
        removeTab,
        setActiveTab,
        getActiveTab,
        getTabByPatientId,
      }}
    >
      {children}
    </ChatTabsContext.Provider>
  );
}

export function useChatTabs() {
  const ctx = useContext(ChatTabsContext);
  if (!ctx) throw new Error("useChatTabs must be used within ChatTabsProvider");
  return ctx;
}
