import { Nullable } from 'frl-ts-utils/lib/types';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { VariableValidationAsyncAction } from './variable-validation-async-action.abstract';
import { VariableValidationResult } from './variable-validation-result';
import { VariableValidatorAsyncCallback } from './variable-validator-async-callback';

export class VariableValidationCallbackAsyncAction<T = any>
    extends
    VariableValidationAsyncAction<T>
{
    public get callbacks(): ReadonlyArray<VariableValidatorAsyncCallback<T>>
    {
        return this._callbacks;
    }

    private readonly _callbacks: VariableValidatorAsyncCallback<T>[];

    public constructor(callbacks: VariableValidatorAsyncCallback<T>[])
    {
        super();
        this._callbacks = callbacks;
    }

    public dispose(): void
    {
        this._callbacks.splice(0);
    }

    protected async invoke(value: T): Promise<Nullable<VariableValidationResult>>
    {
        if (this._callbacks.length === 0)
            return Promise.resolve(null);

        if (this._callbacks.length === 1)
            return this._callbacks[0](value);

        const resultRange = Iteration.FilterNotNull(
            await Promise.all(
                Iteration.Map(
                    this._callbacks,
                    c => c(value))));

        return VariableValidationResult.Combine(resultRange);
    }
}
