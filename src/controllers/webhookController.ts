import { Request, Response } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';


const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

