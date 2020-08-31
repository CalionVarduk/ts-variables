import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { VariableValidationAction } from '../variable-validation-action.abstract';
import { VariableValidationResult } from '../variable-validation-result';
import { PrimitiveVariableValidatorCallback } from './primitive-variable-validator-callback';

export class PrimitiveVariableValidationAction<T = any>
    extends
    VariableValidationAction<Nullable<DeepReadonly<T>>>
{
    public get callbacks(): ReadonlyArray<PrimitiveVariableValidatorCallback<T>>
    {
        return this._callbacks;
    }

    private readonly _callbacks: PrimitiveVariableValidatorCallback<T>[];

    public constructor(callbacks: PrimitiveVariableValidatorCallback<T>[])
    {
        super();
        this._callbacks = callbacks;
    }

    public dispose(): void
    {
        this._callbacks.splice(0);
    }

    public invoke(value: Nullable<DeepReadonly<T>>): Nullable<VariableValidationResult>
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
