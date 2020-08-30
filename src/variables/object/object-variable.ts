import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, Assert, isInstanceOfType } from 'frl-ts-utils/lib/functions';
import { IReadonlyUnorderedMap } from 'frl-ts-utils/lib/collections';
import { EventHandler, IEvent } from 'frl-ts-utils/lib/events';
import { Lazy } from 'frl-ts-utils/lib/lazy';
import { isDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { ObjectVariableChangeTracker } from './object-variable-change-tracker';
import { ObjectVariableValidator } from './object-variable-validator';
import { IObjectVariablePropertySeeker } from './object-variable-property-seeker.interface';
import { VariableBase } from '../variable-base.abstract';
import { ObjectVariableValue } from './object-variable-value';
import { IObjectVariable } from './object-variable.interface';
import { ObjectVariableResetEvent } from './object-variable-reset-event';
import { IVariable } from '../variable.interface';
import { ObjectVariablePropertySeeker } from './object-variable-property-seeker';

export type ObjectVariableParams =
{
    changeTracker?: ObjectVariableChangeTracker;
    validator?: ObjectVariableValidator;
    propertySeeker?: IObjectVariablePropertySeeker;
};

export abstract class ObjectVariable
    extends
    VariableBase<ObjectVariableValue>
    implements
    IObjectVariable
{
    public get value(): ObjectVariableValue
    {
        return this._value;
    }

    public get changeTracker(): ObjectVariableChangeTracker
    {
        return reinterpretCast<ObjectVariableChangeTracker>(super.changeTracker);
    }

    public get validator(): ObjectVariableValidator
    {
        return reinterpretCast<ObjectVariableValidator>(super.validator);
    }

    public get onReset(): IEvent<ObjectVariableResetEvent>
    {
        return this._onReset;
    }

    private readonly _onReset: EventHandler<ObjectVariableResetEvent>;

    private _properties: Nullable<Lazy<IReadonlyUnorderedMap<string, IVariable>>>;
    private _value: ObjectVariableValue;

    protected constructor(params?: ObjectVariableParams)
    {
        if (!isDefined(params))
            params = {};

        super(
            isDefined(params.changeTracker) ? params.changeTracker : new ObjectVariableChangeTracker(),
            isDefined(params.validator) ? params.validator : new ObjectVariableValidator());

        const propertySeeker = isDefined(params.propertySeeker) ? params.propertySeeker : new ObjectVariablePropertySeeker();
        this._properties = new Lazy<IReadonlyUnorderedMap<string, IVariable>>(() => propertySeeker.seek(this));
        this._value = ObjectVariableValue.CreateEmpty();

        this._onReset = new EventHandler<ObjectVariableResetEvent>();
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        this._onReset.dispose();

        for (const property of this._properties!.value)
            if (isDisposable(property.value))
                property.value.dispose();

        this._value = ObjectVariableValue.CreateEmpty();
        this._properties = null;

        super.dispose();
    }

    public reset(): void
    {
        const previousValue = this._value.createSnapshot();

        this.resetImpl();

        const event = new ObjectVariableResetEvent(
            this.changeTracker.originalValue,
            this._value,
            previousValue);

        this._onReset.publish(this, event);
    }

    public getTrackedProperties(): IReadonlyUnorderedMap<string, IVariable>
    {
        Assert.False(this.isDisposed, 'object variable has been disposed');
        return this._properties!.value;
    }

    protected resetImpl(): void
    {
        for (const property of this.getTrackedProperties())
            if (isInstanceOfType(VariableBase, property.value))
                property.value.reset();
    }

    protected configure(): void
    {
        this._value = ObjectVariableValue.CreateCurrent(this._properties!.value);
        this.changeTracker.configure(this);
        this.validator.configure(this);
    }
}
