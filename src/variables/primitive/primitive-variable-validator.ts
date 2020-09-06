import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, isNull } from 'frl-ts-utils/lib/functions';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableValidatorBase } from '../variable-validator-base.abstract';
import { IPrimitiveVariableValidator } from './primitive-variable-validator.interface';
import { PrimitiveVariableValidatorState } from './primitive-variable-validator-state';
import { IReadonlyPrimitiveVariable } from './readonly-primitive-variable.interface';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';
import { PrimitiveVariableValidatedEvent } from './primitive-variable-validated-event';
import { VariableValidationResult } from '../variable-validation-result';
import { VariableValidationParams } from '../variable-validation-params';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { VariableValidatorFinishMode } from '../variable-validator-finish-mode.enum';
import { VariableValidatorCallback } from '../variable-validator-callback';
import { VariableValidatorAsyncCallback } from '../variable-validator-async-callback';
import { VariableValidationCallbackAction } from '../variable-validation-callback-action';
import { VariableValidationCallbackAsyncAction } from '../variable-validation-callback-async-action';

export type PrimitiveVariableValidatorParams<T = any> =
{
    readonly attach?: boolean;
    readonly alwaysFinishSyncValidation?: boolean;
    readonly validateImmediately?: boolean;
    readonly callbacks?: Iterable<VariableValidatorCallback<Nullable<DeepReadonly<T>>>>;
    readonly asyncCallbacks?: Iterable<VariableValidatorAsyncCallback<Nullable<DeepReadonly<T>>>>;
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

    private _changeListener: Nullable<IEventListener<PrimitiveVariableValueChangedEvent<T>>>;
    private _state: PrimitiveVariableValidatorState<T>;

    public constructor(params?: PrimitiveVariableValidatorParams<T>)
    {
        if (!isDefined(params))
            params = {};

        const callbacks = isDefined(params.callbacks) ? Iteration.ToArray(params.callbacks) : [];
        const asyncCallbacks = isDefined(params.asyncCallbacks) ? Iteration.ToArray(params.asyncCallbacks) : [];

        super({
            attach: params.attach,
            alwaysFinishSyncValidation: params.alwaysFinishSyncValidation,
            validationAction: callbacks.length > 0 ?
                new VariableValidationCallbackAction<Nullable<DeepReadonly<T>>>(callbacks) :
                null,
            asyncValidationAction: asyncCallbacks.length > 0 ?
                new VariableValidationCallbackAsyncAction<Nullable<DeepReadonly<T>>>(asyncCallbacks) :
                null
        });

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

        this._state = PrimitiveVariableValidatorState.CreateValid(linkedVariable.value);

        if (this._validateImmediately)
            this.beginValidation(linkedVariable.value);

        this._changeListener = linkedVariable.onValueChanged.listen((_, e) =>
        {
            if (!this.isAttached || this._state.currentValue === e!.currentValue)
                return;

            this.beginValidation(e!.currentValue);
        });
    }

    protected startDetachedValidation(): VariableValidationParams<Nullable<DeepReadonly<T>>>
    {
        this._state = new PrimitiveVariableValidatorState<T>(
            this.linkedVariable!.value, this._state.errors, this._state.warnings);

        const result: VariableValidationParams<Nullable<DeepReadonly<T>>> = {
            value: this.linkedVariable!.value,
            args: null
        };
        return result;
    }

    protected finishValidation(
        result: Nullable<VariableValidationResult>,
        _0: VariableValidatorFinishMode,
        value: Nullable<DeepReadonly<T>>): void
    {
        this._state = isNull(result) ?
            PrimitiveVariableValidatorState.CreateValid(value) :
            PrimitiveVariableValidatorState.CreateFromResult(value, result);

        const event = new PrimitiveVariableValidatedEvent<T>(
            this.isValid,
            this.hasWarnings,
            this._state);

        this.publishValidated(event);
    }
}
