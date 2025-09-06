import mongoose, { Model, Document, FilterQuery, PopulateOptions } from "mongoose";

// Interfaz genérica para la respuesta de un servicio
export interface ServiceResult<T> {
  status: number;
  data?: T | T[] | null;
  error?: string;
  message?: string;
  pagination?: {
    totalDocs: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

/**
 * Clase base genérica para servicios de Mongoose.
 * Proporciona operaciones CRUD básicas con tipado fuerte.
 * @template T - El tipo del documento de Mongoose.
 */
export default class BaseService<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  // ... (el resto de los métodos como findById, etc., se mantienen, pero ahora se benefician del tipado genérico)
  // Ejemplo de un método con tipado fuerte:
  async findById(id: string, populateOptions: (string | PopulateOptions)[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      let query = this.model.findOne({ _id: id, deletedAt: null } as FilterQuery<T>);

      if (populateOptions.length > 0) {
        query = query.populate(populateOptions);
      }
      if (selectOptions) {
        query = query.select(selectOptions);
      }

      const doc = await query.exec();
      if (!doc) return { status: 404, error: "Document not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ... otros métodos CRUD
  
  protected handleError(error: any): ServiceResult<T> {
    // ... la lógica de manejo de errores se mantiene igual
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: `Validation Error: ${error.message}` };
    }
    // ...
    return { status: 500, error: `Database Error: ${error.message}` };
  }
}