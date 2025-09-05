import mongoose, { Model, Document, FilterQuery, UpdateQuery } from "mongoose";

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

export default class BaseService<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  protected handleError(error: any): ServiceResult<T> {
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: `Validation Error: ${error.message}` };
    } else if (error instanceof mongoose.Error.CastError) {
      return { status: 400, error: `Cast Error: ${error.message}` };
    } else if (error instanceof mongoose.Error.DocumentNotFoundError) {
      return { status: 404, error: `Document Not Found: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 11000) {
      return { status: 400, error: `Duplicate Key Error: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 121) {
      return { status: 400, error: `Document Validation Error: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 13435) {
      return { status: 500, error: `Index Build Failure: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 50) {
      return { status: 500, error: `Database Exception: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 55) {
      return { status: 400, error: `Namespace Exists: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 100) {
      return { status: 500, error: `Host Unreachable: ${error.message}` };
    } else if ((error as any).code && (error as any).code === 91) {
      return { status: 500, error: `No Primary Replica Set: ${error.message}` };
    } else if ((error as any).code && (error as any).code === "ECONNREFUSED") {
      return { status: 500, error: `Connection Refused: ${error.message}` };
    } else if ((error as any).code && (error as any).code === "ENOTFOUND") {
      return { status: 500, error: `Database Host Not Found: ${error.message}` };
    } else if ((error as any).code && (error as any).code === "ETIMEDOUT") {
      return { status: 500, error: `Connection Timeout: ${error.message}` };
    } else if ((error as any).code && (error as any).code === "EAI_AGAIN") {
      return { status: 500, error: `DNS Lookup Failed: ${error.message}` };
    } else if ((error as any).code && (error as any).code === "EADDRINUSE") {
      return { status: 500, error: `Address in Use: ${error.message}` };
    } else {
      console.log(error);
      return { status: 500, error: `Database Error: ${error.message}` };
    }
  }

  protected queryPopulate(populates: any[], selectOptions: string | null, query: any) {
    (populates || []).forEach((populateOptions) => {
      query.populate(populateOptions);
    });

    if (selectOptions) {
      query.select(selectOptions);
    }

    return query;
  }

  async create(data: Partial<T>, populateOptions: any[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      const doc = new this.model(data);
      const savedDoc = await doc.save();

      if ((populateOptions && populateOptions.length) || selectOptions) {
        const populatedDoc = await this.findById(savedDoc._id as any, populateOptions, selectOptions);
        return { status: 201, data: populatedDoc.data as T };
      }
      return { status: 201, data: savedDoc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findAll(
    page: number | string = 0,
    limit: number | string = 250,
    filters: FilterQuery<T> = {} as any,
    populateOptions: any[] = [],
    selectOptions: string | null = null
  ): Promise<ServiceResult<T>> {
    const pageNum = Math.max(0, Number(page) || 0);
    const pageSize = Math.min(250, Number(limit) || 250);

    try {
      let query = this.model.find({ ...(filters as any), deletedAt: null });

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions || [], selectOptions || null, query);
      }

      const totalDocs = await this.model.countDocuments({ ...(filters as any), deletedAt: null });
      const docs = await query.skip(pageNum * pageSize).limit(pageSize).exec();

      return {
        status: 200,
        data: docs as any,
        pagination: {
          totalDocs,
          totalPages: Math.ceil(totalDocs / pageSize),
          currentPage: pageNum,
          pageSize,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findById(id: string, populateOptions: any[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      let query = this.model.findOne({ _id: id, deletedAt: null });

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const doc = await query.exec();
      if (!doc) return { status: 404, error: "Document not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findOneByCriteria(filters: FilterQuery<T>, populateOptions: any[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      let query = this.model.findOne({ ...(filters as any), deletedAt: null });

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const doc = await query.exec();
      if (!doc) return { status: 404, error: "Document not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateById(id: string, updateData: UpdateQuery<T>, populateOptions: any[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      let query = this.model.findOneAndUpdate(
        { _id: id, deletedAt: null } as any,
        { ...(updateData as any), updatedAt: new Date() },
        { new: true }
      );

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const updatedDoc = await query.exec();
      if (!updatedDoc) return { status: 404, error: "Document not found" };
      return { status: 200, data: updatedDoc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async softDeleteById(id: string, populateOptions: any[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      let query = this.model.findById(id);

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const doc = await query.exec();
      if (!doc) return { status: 404, error: "Document not found" };

      (doc as any).deletedAt = new Date();
      await (doc as any).save();

      return { status: 200, message: "Document soft deleted", data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteById(id: string, populateOptions: any[] = [], selectOptions: string | null = null): Promise<ServiceResult<T>> {
    try {
      let query = this.model.findByIdAndDelete(id);

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const deletedDoc = await query.exec();
      if (!deletedDoc) return { status: 404, error: "Document not found" };
      return { status: 200, message: "Document deleted" };
    } catch (error) {
      return this.handleError(error);
    }
  }
}