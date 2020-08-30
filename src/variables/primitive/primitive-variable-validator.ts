import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, isNull } from 'frl-ts-utils/lib/functions';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableValidatorBase } from '../variable-validator-base.abstract';
import { IPrimitiveVariableValidator } from './primitive-variable-validator.interface';
import { PrimitiveVariableValidatorState } from './primitive-variable-validator-state';
import { IReadonlyPrimitiveVariable } from './readonly-primitive-variable.interface';
import { PrimitiveVariableValidatorCallback } from './primitive-variable-validator-callback';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';
import { PrimitiveVariableValidatedEvent } from './primitive-variable-validated-event';
import { VariableValidationResult } from '../variable-validation-result';

export type PrimitiveVariableValidatorParams<T = any> =
{
    readonly attach?: boolean;
    readonly validateImmediately?: boolean;
    readonly callbacks?: Iterable<PrimitiveVariableValidatorCallback<T>>;
};

export class PrimitiveVariableValidator<T = any>
    extends
    VariableValidatorBase<Nullable<DeepReadonly<T>>>
    implements
    IPrimitiveVariableValidator<T>
{
    public get state(): PrimitiveVariableValidatorState<T>
    {
        return this._state;
    }

    protected get linkedVariable(): Nullable<IReadonlyPrimitiveVariable<T>>
    {
        return reinterpretCast<Nullable<IReadonlyPrimitiveVariable<T>>>(super.linkedVariable);
    }

    private readonly _validateImmediately: boolean;
    private readonly _callbacks: PrimitiveVariableValidatorCallback<T>[];

    private _changeListener: Nullable<IEventListener<PrimitiveVariableValueChangedEvent<T>>>;
    private _state: PrimitiveVariableValidatorState<T>;

    public constructor(params?: PrimitiveVariableValidatorParams<T>)
    {
        if (!isDefined(params))
            params = {};

        super(params.attach);

        this._callbacks = isDefined(params.callbacks) ? [...params.callbacks] : [];
        this._validateImmediately = isDefined(params.validateImmediately) ? params.validateImmediately : true;
        this._changeListener = null;
        this._state = PrimitiveVariableValidatorState.CreateEmpty<T>();
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        if (!isNull(this._changeListener))
        {
            this._changeListener.dispose();
            this._changeListener = null;
        }
        this._state = PrimitiveVariableValidatorState.CreateEmpty<T>();
        this._callbacks.splice(0);
        super.dispose();
    }

    public configure(linkedVariable: IReadonlyPrimitiveVariable<T>): void
    {
        super.configure(linkedVariable);

        this._state = PrimitiveVariableValidatorState.CreateFromResult(
            linkedVariable.value, VariableValidationResult.CreateEmpty());

        if (this._validateImmediately)
            this.beginValidation(linkedVariable.value);

        this._changeListener = linkedVariable.onValueChanged.listen((_, e) =>
        {
            if (!this.isAttached || this._state.currentValue === e!.currentValue)
                return;

            this.beginValidation(e!.currentValue);
        });
    }

    protected validateImpl(): Promise<void>
    {
        const currentValue = this.linkedVariable!.value;
        return this.beginValidation(currentValue);
    }

    protected async checkValidity(value: Nullable<DeepReadonly<T>>): Promise<VariableValidationResult>
    {
        if (this._callbacks.length === 0)
            return Promise.resolve(VariableValidationResult.CreateEmpty());

        if (this._callbacks.length === 1)
        {
            const callbackResult = await Promise.resolve(this._callbacks[0](value));
            return isNull(callbackResult) ?
                VariableValidationResult.CreateEmpty() :
                callbackResult;
        }

        const resultRange = await Promise.all(this._callbacks.map(v => Promise.resolve(v(value))));
        const errors: string[] = [];
        const warnings: string[] = [];

        resultRange.forEach(state =>
            {
                if (isNull(state))
                    return;

                if (!isNull(state.errors))
                    errors.push(...state.errors);

                if (!isNull(state.warnings))
                    warnings.push(...state.warnings);
            });

        const result = new VariableValidationResult(
            errors.length > 0 ? errors : null,
            warnings.length > 0 ? warnings : null);

        return result;
    }

    protected finishValidation(value: Nullable<DeepReadonly<T>>, result: VariableValidationResult): void
    {
        this._state = PrimitiveVariableValidatorState.CreateFromResult(value, result);
        const event = new PrimitiveVariableValidatedEvent<T>(
            this.isValid,
            this.hasWarnings,
            this._state);

        this.publishValidated(event);
    }
}
