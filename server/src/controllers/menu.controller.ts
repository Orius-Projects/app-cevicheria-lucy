import { Request, Response, NextFunction } from 'express';
import * as menuService from '../services/menu.service';
import { UnauthorizedError } from '../middlewares/error';

export async function getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dateOverride = typeof req.query.date === 'string' ? req.query.date : undefined;
    const menu = await menuService.getTodayMenu(dateOverride);
    res.status(200).json(menu);
  } catch (error) {
    next(error);
  }
}

export async function createDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const menuDay = await menuService.createMenuDay(req.body, req.user);
    res.status(201).json(menuDay);
  } catch (error) {
    next(error);
  }
}

export async function getDayByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const menuDay = await menuService.getMenuDayByDate(req.params.date);
    res.status(200).json(menuDay);
  } catch (error) {
    next(error);
  }
}

export async function updateDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await menuService.updateMenuDay(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function publishDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const published = await menuService.publishMenuDay(req.params.id, req.user);
    res.status(200).json(published);
  } catch (error) {
    next(error);
  }
}

export async function getSections(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sections = await menuService.listMenuSections();
    res.status(200).json(sections);
  } catch (error) {
    next(error);
  }
}

export async function getDishes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dishes = await menuService.listDishes();
    res.status(200).json(dishes);
  } catch (error) {
    next(error);
  }
}

export async function postDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dish = await menuService.createDish(req.body);
    res.status(201).json(dish);
  } catch (error) {
    next(error);
  }
}

export async function patchDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dish = await menuService.updateDish(req.params.id, req.body);
    res.status(200).json(dish);
  } catch (error) {
    next(error);
  }
}

export async function deleteDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await menuService.deleteDish(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function replenish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { quantity, reason } = req.body;
    const item = await menuService.replenishRations(
      req.params.id,
      quantity,
      reason,
      req.user
    );
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

export async function adjust(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { remainingRations, reason } = req.body;
    const item = await menuService.adjustRations(
      req.params.id,
      remainingRations,
      reason,
      req.user
    );
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

export async function soldOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { reason } = req.body;
    const item = await menuService.markSoldOut(req.params.id, reason, req.user);
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

export async function reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const item = await menuService.reactivateDish(req.params.id, req.user);
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

export async function getAdjustments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adjustments = await menuService.getRationAdjustments(req.params.id);
    res.status(200).json(adjustments);
  } catch (error) {
    next(error);
  }
}
