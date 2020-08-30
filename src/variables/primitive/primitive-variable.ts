import { Nullable, DeepReadonly, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined } from 'frl-ts-utils/lib/functions';
import { IEvent, EventHandler } from 'frl-ts-utils/lib/events';
import { PrimitiveVariableChangeTracker } from './primitive-variable-change-tracker';
import { PrimitiveVariableValidator } from './primitive-variable-validator';
import { VariableBase } from '../variable-base.abstract';
import { IPrimitiveVariable } from './primitive-variable.interface';
import { PrimitiveVariableValueChangingEvent } from './primitive-variable-value-changing-event';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';
import { PrimitiveVariableValueChangeCancelledEvent } from './primitive-variable-value-change-cancelled-event';
import { PrimitiveVariableValueChangeSource } from './primitive-variable-value-change-source.enum';
import { PrimitiveVariableValueChangeCancellationReason } from './primitive-variable-value-change-cancellation-reason.enum';

export type PrimitiveVariableParams<T = any> =
{
    readonly changeTracker?: PrimitiveVariableChangeTracker<T>;
    readonly validator?: PrimitiveVariableValidator<T>;
    readonly value?: Nullable<T>;
    resetMapper?(value: Nullable<DeepReadonly<T>>): Nullable<T>;
};

export class PrimitiveVariable<T = any>
    extends
    VariableBase<Nullable<DeepReadonly<T>>>
    implements
    IPrimitiveVariable<T>
{
    public get value(): Nullable<DeepReadonly<T>>
    {
        return toDeepReadonly(this._value);
    }

    public get changeTracker(): PrimitiveVariableChangeTracker<T>
    {
        return reinterpretCast<PrimitiveVariableChangeTracker<T>>(super.changeTracker);
    }

    public get validator(): PrimitiveVariableValidator<T>
    {
        return reinterpretCast<PrimitiveVariableValidator<T>>(super.validator);
    }

    public get onValueChanging(): IEvent<PrimitiveVariableValueChangingEvent<T>>
    {
        return this._onValueChanging;
    }

    public get onValueChanged(): IEvent<PrimitiveVariableValueChangedEvent<T>>
    {
        return this._onValueChanged;
    }

    public get onValueChangeCancelled(): IEvent<PrimitiveVariableValueChangeCancelledEvent<T>>
    {
        return this._onValueChangeCancelled;
    }

    protected get mutableValue(): Nullable<T>
    {
        return this._value;
    }

    protected readonly resetMapper: (original: Nullable<DeepReadonly<T>>) => Nullable<T>;

    private readonly _onValueChanging: EventHandler<PrimitiveVariableValueChangingEvent<T>>;
    private readonly _onValueChanged: EventHandler<PrimitiveVariableValueChangedEvent<T>>;
    private readonly _onValueChangeCancelled: EventHandler<PrimitiveVariableValueChangeCancelledEvent<T>>;

    private _value: Nullable<T>;

    public constructor(params?: PrimitiveVariableParams<T>)
    {
        if (!isDefined(params))
            params = {};

        super(
            isDefined(params.changeTracker) ? params.changeTracker : new PrimitiveVariableChangeTracker<T>(),
            isDefined(params.validator) ? params.validator : new PrimitiveVariableValidator<T>());

        this._value = isDefined(params.value) ? params.value : null;
        this.resetMapper = isDefined(params.resetMapper) ? params.resetMapper : v => reinterpretCast<Nullable<T>>(v);

        this._onValueChanging = new EventHandler<PrimitiveVariableValueChangingEvent<T>>();
        this._onValueChanged = new EventHandler<PrimitiveVariableValueChangedEvent<T>>();
        this._onValueChangeCancelled = new EventHandler<PrimitiveVariableValueChangeCancelledEvent<T>>();

        this.changeTracker.configure(this);
        this.validator.configure(this);
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        this._onValueChanging.dispose();
        this._onValueChanged.dispose();
        this._onValueChangeCancelled.dispose();

        super.dispose();
    }

    public reset(): void
    {
        this.setValue(this.resetMapper(this.changeTracker.originalValue), PrimitiveVariableValueChangeSource.Reset);
    }

    public tryUpdate(value: Nullable<T>): boolean
    {
        if (this.changeTracker.areEqual(this.value, toDeepReadonly(value)))
        {
            this._cancelUpdate(value, PrimitiveVariableValueChangeCancellationReason.EqualityComparison);
            return false;
        }

        const changingEvent = new PrimitiveVariableValueChangingEvent<T>(
            this.changeTracker.originalValue,
            this.value,
            toDeepReadonly(value));

        this.publishValueChanging(changingEvent);

        if (changingEvent.cancel)
        {
            this._cancelUpdate(value, PrimitiveVariableValueChangeCancellationReason.OnChangingEvent);
            return false;
        }
        this.setValue(value, PrimitiveVariableValueChangeSource.TryUpdate);
        return true;
    }

    public update(value: Nullable<T>): void
    {
        this.setValue(value, PrimitiveVariableValueChangeSource.Update);
    }

    protected setValue(value: Nullable<T>, changeSource: PrimitiveVariableValueChangeSource): void
    {
        const previousValue = this.value;
        this._value = value;

        const event = new PrimitiveVariableValueChangedEvent<T>(
            this.changeTracker.originalValue,
            previousValue,
            this.value,
            changeSource);

        this.publishValueChanged(event);
    }

    protected publishValueChanging(e: PrimitiveVariableValueChangingEvent<T>): void
    {
        this._onValueChanging.publish(this, e);
    }

    protected publishValueChanged(e: PrimitiveVariableValueChangedEvent<T>): void
    {
        this._onValueChanged.publish(this, e);
    }

    protected publishValueChangeCancelled(e: PrimitiveVariableValueChangeCancelledEvent<T>): void
    {
        this._onValueChangeCancelled.publish(this, e);
    }

    private _cancelUpdate(value: Nullable<T>, reason: PrimitiveVariableValueChangeCancellationReason): void
    {
        const event = new PrimitiveVariableValueChangeCancelledEvent<T>(
            this.changeTracker.originalValue,
            this.value,
            toDeepReadonly(value),
            reason);

        this.publishValueChangeCancelled(event);
    }
}
