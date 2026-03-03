import { Model, QueryOptions, QueryFilter, ProjectionType } from "mongoose";

export class AbstractRepository<T> {
    constructor(private readonly model: Model<T>) {}

    public async create(data: Partial<T>) {
        const doc =  new this.model(data);
        return doc.save();
    }


    public async getOne(filter: QueryFilter<T>, projection?: ProjectionType<T>, options?: QueryOptions<T>) {
        return this.model.findOne(filter, projection, options);
    }
    
    public async getAll(filter: QueryFilter<T>, projection?: ProjectionType<T>, options?: QueryOptions<T>) {
        return this.model.find(filter, projection, options);
    }

    public async findOneAndUpdate(filter: QueryFilter<T>, data: Partial<T>, options?: QueryOptions<T>) {
        return this.model.findOneAndUpdate(filter, data, options);
    }

}
