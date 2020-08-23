import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, isNull } from 'frl-ts-utils/lib/functions';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableValidatorBase } from '../variable-validator-base.abstract';
import { IPrimitiveVariableValidator } from './primitive-variable-validator.interface';
import { PrimitiveVariableValidatorState } from './primitive-variable-validator-state';
import { IReadonlyPrimitiveVariable } from './readonly-primitive-variable.interface';
import { PrimitiveVariableValidatorDelegate } from './primitive-variable-validator-delegate';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';
import { VariableValidatorState } from '../variable-validator-state';
import { PrimitiveVariableValidatedEvent } from './primitive-variable-validated-event';

export type PrimitiveVariableValidatorParams<T = any> =
{
    readonly attach?: boolean;
    readonly validateImmediately?: boolean;
    readonly validators?: ReadonlyArray<PrimitiveVariableValidatorDelegate<T>>;
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
    private readonly _validators: ReadonlyArray<PrimitiveVariableValidatorDelegate<T>>;

    private _changeListener: Nullable<IEventListener<PrimitiveVariableValueChangedEvent<T>>>;
    private _state: PrimitiveVariableValidatorState<T>;

    public constructor(params?: PrimitiveVariableValidatorParams<T>)
    {
        if (!isDefined(params))
            params = {};

        super(params.attach);

        this._validators = isDefined(params.validators) ? params.validators : [];
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
        super.dispose();
    }

    public configure(linkedVariable: IReadonlyPrimitiveVariable<T>): void
    {
        super.configure(linkedVariable);

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

        if (this._state.currentValue === currentValue)
            return Promise.resolve();

        return this.beginValidation(currentValue);
    }

    protected async checkValidity(value: Nullable<DeepReadonly<T>>): Promise<VariableValidatorState>
    {
        if (this._validators.length === 0)
            return Promise.resolve(VariableValidatorState.CreateEmpty());

        if (this._validators.length === 1)
        {
            const validatorResult = await Promise.resolve(this._validators[0](value));
            return isNull(validatorResult) ?
                VariableValidatorState.CreateEmpty() :
                validatorResult;
        }

        const resultRange = await Promise.all(this._validators.map(v => Promise.resolve(v(value))));
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

        const result = new VariableValidatorState(
            errors.length > 0 ? errors : null,
            warnings.length > 0 ? warnings : null);

        return result;
    }

    protected finishValidation(value: Nullable<DeepReadonly<T>>, result: VariableValidatorState): void
    {
        this._state = new PrimitiveVariableValidatorState<T>(value, result.errors, result.warnings);
        const event = new PrimitiveVariableValidatedEvent<T>(
            this.isValid,
            this.hasWarnings,
            this._state);

        this.publishValidated(event);
    }
}
