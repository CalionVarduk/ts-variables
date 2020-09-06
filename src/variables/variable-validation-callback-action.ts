import { Nullable } from 'frl-ts-utils/lib/types';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { VariableValidationAction } from './variable-validation-action.abstract';
import { VariableValidationResult } from './variable-validation-result';
import { VariableValidatorCallback } from './variable-validator-callback';

export class VariableValidationCallbackAction<T = any>
    extends
    VariableValidationAction<T>
{
    public get callbacks(): ReadonlyArray<VariableValidatorCallback<T>>
    {
        return this._callbacks;
    }

    private readonly _callbacks: VariableValidatorCallback<T>[];

    public constructor(callbacks: VariableValidatorCallback<T>[])
    {
        super();
        this._callbacks = callbacks;
    }

    public dispose(): void
    {
        this._callbacks.splice(0);
    }

    public invoke(value: T): Nullable<VariableValidationResult>
    {
        if (this._callbacks.length === 0)
            return null;

        if (this._callbacks.length === 1)
            return this._callbacks[0](value);

        const resultRange = Iteration.FilterNotNull(
            Iteration.Map(
                this._callbacks,
                c => c(value)));

        return VariableValidationResult.Combine(resultRange);
    }
}
