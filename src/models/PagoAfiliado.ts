import mongoose, { Schema, Document } from 'mongoose';

export interface IPagoAfiliado extends Document {
    afiliado: mongoose.Types.ObjectId;
    mesesPagados: Date[];
    preferenceId: string;
    pagoId?: string;
    estado: 'pendiente' | 'pagado' | 'fallido';
    fechaCreacion: Date;
}

const PagoAfiliadoSchema: Schema = new Schema({
    afiliado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Afiliado',
        required: true
    },
    mesesPagados: [{
        type: Date,
        required: true
    }],
    preferenceId: {
        type: String,
        required: true
    },
    pagoId: {
        type: String
    },
    estado: {
        type: String,
        enum: ['pendiente', 'pagado', 'fallido'],
        default: 'pendiente'
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
});

const PagoAfiliado = mongoose.model<IPagoAfiliado>('PagoAfiliado', PagoAfiliadoSchema);

export default PagoAfiliado;