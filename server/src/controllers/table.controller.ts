import { Request, Response, NextFunction } from 'express';
import {
  listTablesWithStatus,
  getTableDetail,
  closeTableSession,
  createTable,
  updateTable
} from '../services/table.service';
import { UnauthorizedError } from '../middlewares/error';

export async function getTables(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listTablesWithStatus();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getTableById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = await getTableDetail(req.params.id);
    res.status(200).json(table);
  } catch (error) {
    next(error);
  }
}

export async function postTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const created = await createTable(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function patchTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await updateTable(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function closeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const { notes } = req.body || {};
    const closed = await closeTableSession(req.params.id, req.user, notes);
    res.status(200).json(closed);
  } catch (error) {
    next(error);
  }
}

