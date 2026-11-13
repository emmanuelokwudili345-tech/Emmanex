import { Router, type Request, type RequestHandler } from "express";
import { successResponse } from "../../api-response.js";
import { getAuthConfig } from "../../config/env.js";
import { HttpError } from "../../middleware/error-handler.js";
import { requireNeonAuth } from "../auth/neon-auth-middleware.js";
import { orderService } from "./order-service.js";
import {
  findCustomerOrderId,
  parseCheckoutRequest,
} from "./order-validation.js";
import { shippingOptions } from "./shipping-options.js";
import type { OrderDependencies } from "./order-types.js";

async function findRequestCustomer(
  request: Request,
  dependencies: OrderDependencies,
): Promise<{ id: string }> {
  const neonAuthUserId = request.neonAuthUser?.id;
  if (!neonAuthUserId) {
    throw new HttpError(401, "Authentication is required.");
  }

  const customer = await dependencies.findCustomer(neonAuthUserId);
  if (!customer) {
    throw new HttpError(409, "Your customer profile is not ready. Please refresh and try again.");
  }

  return customer;
}

export function createOrderRouter(
  dependencies: OrderDependencies = orderService,
  authenticate: RequestHandler = requireNeonAuth(getAuthConfig()),
) {
  const router = Router();

  router.get("/shipping/options", authenticate, (_request, response) => {
    response.json(
      successResponse("Shipping options retrieved.", { options: shippingOptions }),
    );
  });

  router.get("/orders", authenticate, async (request, response, next) => {
    try {
      const customer = await findRequestCustomer(request, dependencies);
      const orders = await dependencies.listCustomerOrders(customer.id);
      response.json(successResponse("Order history retrieved.", { orders }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:id", authenticate, async (request, response, next) => {
    try {
      const orderId = findCustomerOrderId(request.params.id);
      const customer = await findRequestCustomer(request, dependencies);
      const order = await dependencies.findCustomerOrder(customer.id, orderId);

      if (!order) {
        throw new HttpError(404, "Order not found.");
      }

      response.json(successResponse("Order retrieved.", { order }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders", authenticate, async (request, response, next) => {
    try {
      const delivery = parseCheckoutRequest(request.body);
      const customer = await findRequestCustomer(request, dependencies);
      const order = await dependencies.createDemoOrder({
        userId: customer.id,
        delivery,
      });

      response.status(201).json(
        successResponse(
          "Order placed. Demo payment was simulated; no payment was collected.",
          { order },
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
