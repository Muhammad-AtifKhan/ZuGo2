import prisma from '../lib/prisma';
import { Request, Response } from 'express';


// Get all routes
export const getAllRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await prisma.route.findMany({
      include: {
        sourceCity: true,
        destCity: true
      }
    });
    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create Route
export const createRoute = async (req: Request, res: Response) => {
  try {
    const { sourceCityId, destCityId, distance, price } = req.body;
    
    if (!sourceCityId || !destCityId) {
      return res.status(400).json({ error: 'sourceCityId and destCityId are required' });
    }

    const route = await prisma.route.create({
      data: {
        sourceCityId,
        destCityId,
        distance: distance || 0,
        price: price || 0
      }
    });

    res.status(201).json(route);
  } catch (error: any) {
    console.error('Error creating route:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Route between these cities already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

