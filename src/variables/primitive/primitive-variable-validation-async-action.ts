import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { VariableValidationAsyncAction } from '../variable-validation-async-action.abstract';
import { PrimitiveVariableValidatorAsyncCallback } from './primitive-variable-validator-async-callback';
import { VariableValidationResult } from '../variable-validation-result';

export class PrimitiveVariableValidationAsyncAction<T = any>
    extends
    VariableValidationAsyncAction<Nullable<DeepReadonly<T>>>
{
    public get callbacks(): ReadonlyArray<PrimitiveVariableValidatorAsyncCallback<T>>
    {
        return this._callbacks;
    }

    private readonly _callbacks: PrimitiveVariableValidatorAsyncCallback<T>[];

    public constructor(callbacks: PrimitiveVariableValidatorAsyncCallback<T>[])
    {
        super();
        this._callbacks = callbacks;
    }

    public dispose(): void
    {
        this._callbacks.splice(0);
    }

    protected async invoke(value: Nullable<DeepReadonly<T>>): Promise<Nullable<VariableValidationResult>>
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
