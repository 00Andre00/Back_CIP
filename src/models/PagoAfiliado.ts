import mongoose, { Document, Schema } from 'mongoose';

export interface IPagoAfiliado extends Document {
  afiliado: mongoose.Types.ObjectId;
  mesesPagados: Date[];
  preferenceId: string;
  pagoId?: string;
  estado: 'pendiente' | 'pagado' | 'fallido' | 'cancelado';
  montoTotal: number;
  fechaPago?: Date;
  fechaCreacion: Date;
  metodoPago?: string;
}

const pagoAfiliadoSchema: Schema<IPagoAfiliado> = new Schema<IPagoAfiliado>({
  afiliado: { 
    type: Schema.Types.ObjectId, 
    ref: 'Afiliado', 
    required: true 
  },
  mesesPagados: [{ 
    type: Date, 
    required: true 
  }],
  preferenceId: { 
    type: String, 
    required: true,
    unique: true 
  },
  pagoId: { 
    type: String, 
    default: null 
  },
  estado: { 
    type: String, 
    enum: ['pendiente', 'pagado', 'fallido', 'cancelado'],
    default: 'pendiente' 
  },
  montoTotal: { 
    type: Number, 
    required: true 
  },
  fechaPago: { 
    type: Date, 
    default: null 
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  metodoPago: { 
    type: String, 
    default: null 
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
pagoAfiliadoSchema.index({ afiliado: 1 });
pagoAfiliadoSchema.index({ preferenceId: 1 });
pagoAfiliadoSchema.index({ pagoId: 1 });
pagoAfiliadoSchema.index({ estado: 1 });

const PagoAfiliado = mongoose.model<IPagoAfiliado>('PagoAfiliado', pagoAfiliadoSchema);

export default PagoAfiliado;