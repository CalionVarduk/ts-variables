import { Nullable } from 'frl-ts-utils/lib/types';
import { IDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { VariableValidationResult } from './variable-validation-result';

export abstract class VariableValidationAction<T = any>
    implements
    IDisposable
{
    protected constructor() {}

    public dispose(): void {}
    public abstract invoke(value: T): Nullable<VariableValidationResult>;
}
