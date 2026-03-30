"use client";

import { mockProjects } from "@/lib/mockData";
import {
  calculatePercentDone,
  calculateRowsLeft,
  flattenPartsToRows,
} from "@/lib/projectUtils";
import { isProject, sanitizeProject } from "@/lib/validation";
import type { HistoryProjectSummary, Project } from "@/types/project";
import { getCurrentElapsedSeconds } from "@/lib/timer";

const STORAGE_KEY = "crochet-guide-projects";

const hasWindow = () => typeof window !== "undefined";

const sortProjects = (projects: Project[]): Project[] =>
  [...projects].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

export const saveProjects = (projects: Project[]): void => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

const readRawProjects = (): unknown => {
  if (!hasWindow()) {
    return [];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const clearInvalidProjects = (): Project[] => {
  saveProjects([]);
  return [];
};

export const seedMockProjectsIfEmpty = (): Project[] => {
  const current = readRawProjects();
  if (Array.isArray(current) && current.length > 0) {
    return getProjects();
  }

  saveProjects(mockProjects);
  return mockProjects;
};

export const getProjects = (): Project[] => {
  const raw = readRawProjects();
  if (!Array.isArray(raw)) {
    return clearInvalidProjects();
  }

  const validatedProjects = raw.filter(isProject).map(sanitizeProject);
  if (validatedProjects.length !== raw.length) {
    saveProjects(validatedProjects);
  }

  return sortProjects(
    validatedProjects.map((project) => ({
      ...project,
      percentDone: calculatePercentDone(project),
      totalRows: flattenPartsToRows(project.parts).length || project.parsedRows.length,
    })),
  );
};

export const getProjectById = (id: string): Project | null =>
  getProjects().find((project) => project.id === id) ?? null;

export const createProject = (project: Project): Project => {
  const projects = getProjects();
  const normalizedProject = {
    ...project,
    parsedRows: project.parsedRows.length > 0 ? project.parsedRows : flattenPartsToRows(project.parts),
    totalRows: flattenPartsToRows(project.parts).length || project.parsedRows.length,
    percentDone: calculatePercentDone(project),
    elapsedSeconds: project.elapsedSeconds ?? 0,
    timerStartedAt: project.timerStartedAt ?? null,
    isTimerRunning: project.isTimerRunning ?? false,
    completedAt: project.completedAt ?? null,
  };

  saveProjects(sortProjects([normalizedProject, ...projects]));
  return normalizedProject;
};

export const updateProject = (
  id: string,
  updates: Partial<Project>,
): Project | null => {
  const projects = getProjects();
  let updatedProject: Project | null = null;

  const nextProjects = projects.map((project) => {
    if (project.id !== id) {
      return project;
    }

    const mergedProject: Project = sanitizeProject({
      ...project,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    updatedProject = {
      ...mergedProject,
      parsedRows:
        mergedProject.parsedRows.length > 0
          ? mergedProject.parsedRows
          : flattenPartsToRows(mergedProject.parts),
      totalRows:
        flattenPartsToRows(mergedProject.parts).length || mergedProject.parsedRows.length,
      percentDone: calculatePercentDone(mergedProject),
    };

    return updatedProject;
  });

  saveProjects(sortProjects(nextProjects));
  return updatedProject;
};

export const deleteProject = (id: string): void => {
  const nextProjects = getProjects().filter((project) => project.id !== id);
  saveProjects(nextProjects);
};

export const renameProject = (id: string, newName: string): Project | null =>
  updateProject(id, { name: newName.trim() });

export const getHistorySummaries = (): HistoryProjectSummary[] =>
  getProjects().map((project) => ({
    id: project.id,
    name: project.name,
    percentDone: calculatePercentDone(project),
    currentRow: project.currentRow,
    totalRows: project.totalRows,
    rowsLeft: calculateRowsLeft(project),
    updatedAt: project.updatedAt,
    elapsedSeconds: getCurrentElapsedSeconds(project),
  }));
