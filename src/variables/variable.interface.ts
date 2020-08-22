import { IVariableChangeTracker } from './variable-change-tracker.interface';
import { IVariableValidator } from './variable-validator.interface';

export interface IVariable<T = any>
{
    readonly value: T;
    readonly changeTracker: IVariableChangeTracker<T>;
    readonly validator: IVariableValidator;
}
