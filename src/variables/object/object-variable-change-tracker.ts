import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, isNull } from 'frl-ts-utils/lib/functions';
import { UnorderedMap, IReadonlyUnorderedMap, Iteration, MapEntry, makeMapEntry } from 'frl-ts-utils/lib/collections';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableChangeTrackerBase } from '../variable-change-tracker-base.abstract';
import { ObjectVariableValue } from './object-variable-value';
import { IObjectVariableChangeTracker } from './object-variable-change-tracker.interface';
import { ObjectVariableChanges } from './object-variable-changes.abstract';
import { IReadonlyObjectVariable } from './readonly-object-variable.interface';
import { ObjectVariablePropertyChange } from './object-variable-property-change';
import { IVariable } from '../variable.interface';
import { ObjectVariablePropertyChangeType } from './object-variable-property-change-type.enum';
import { VariableChangeEvent } from '../variable-change-event';

class MutableObjectVariableChanges
    extends
    ObjectVariableChanges
{
    public currentValue: ObjectVariableValue;
    public readonly properties: UnorderedMap<string, ObjectVariablePropertyChange>;

    public constructor(currentValue: ObjectVariableValue)
    {
        super();
        this.currentValue = currentValue;
        this.properties = new UnorderedMap<string, ObjectVariablePropertyChange>();
    }
}

export type ObjectVariableChangeTrackerParams =
{
    readonly attach?: boolean;
};

export class ObjectVariableChangeTracker
    extends
    VariableChangeTrackerBase<ObjectVariableValue>
    implements
    IObjectVariableChangeTracker
{
    public get hasChanged(): boolean
    {
        return this._changes.properties.length > 0;
    }

    public get originalValue(): ObjectVariableValue
    {
        return this._originalValue;
    }

    public get changes(): ObjectVariableChanges
    {
        return this._changes;
    }

    protected get linkedVariable(): Nullable<IReadonlyObjectVariable>
    {
        return reinterpretCast<Nullable<IReadonlyObjectVariable>>(super.linkedVariable);
    }

    protected get properties(): Nullable<IReadonlyUnorderedMap<string, IVariable>>
    {
        return this._properties;
    }

    private readonly _propertyChangeListeners: IEventListener[];
    private readonly _changes: MutableObjectVariableChanges;

    private _resetListener: Nullable<IEventListener>; // TODO: can be removed for now
    private _properties: Nullable<IReadonlyUnorderedMap<string, IVariable>>;
    private _originalValue: ObjectVariableValue;

    public constructor(params?: ObjectVariableChangeTrackerParams)
    {
        if (!isDefined(params))
            params = {};

        super(params.attach);

        this._originalValue = ObjectVariableValue.CreateEmpty();
        this._propertyChangeListeners = [];
        this._properties = null;
        this._resetListener = null;
        this._changes = new MutableObjectVariableChanges(this._originalValue);
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        if (!isNull(this._resetListener))
        {
            this._resetListener.dispose();
            this._resetListener = null;
        }
        for (const listener of this._propertyChangeListeners)
            listener.dispose();

        this._propertyChangeListeners.splice(0);
        this._changes.properties.clear();
        this._originalValue = ObjectVariableValue.CreateEmpty();
        this._changes.currentValue = this._originalValue;
        this._properties = null;
        super.dispose();
    }

    public configure(linkedVariable: IReadonlyObjectVariable): void
    {
        super.configure(linkedVariable);

        this._properties = linkedVariable.getTrackedProperties();
        this._originalValue = ObjectVariableValue.CreateOriginal(this._properties);
        this._updateChanges(linkedVariable.value);

        // TODO: hm, leave optimizations for now
        // idea: onReseting event, change tracker sets an internal flag
        // and resets that flag in onReset event
        // the flag will cause the tracker to ignore property changes
        // issues: if an exception is thrown during resetting, then the tracker will be locked because the flag won't be reset
        // this would require some try ... finally ... approach (and probably an additional event, like onResetFailure)
        // also, what if object reset is being called recursively...?
        // it would probably be safer if the variable itself would have an isResetting boolean property
        // for now, simply ignore it
        // this._resetListener = linkedVariable.onReset.listen((_, e) =>
        //     {
        //         if (!this.isAttached)
        //             return;

        //         const changes = this._updateChanges(e!.currentValue);
        //         this._publishObjectChange(changes, e!);
        //     });

        for (const property of this._properties)
        {
            const listener = property.value.changeTracker.onChange.listen((_, e) =>
                {
                    if (!this.isAttached)
                        return;

                    let currentPropertyChanges = this._changes.properties.tryGet(property.key);

                    if (isNull(currentPropertyChanges) || property.value.changeTracker.hasChanged)
                    {
                        currentPropertyChanges = new ObjectVariablePropertyChange(
                            ObjectVariablePropertyChangeType.Changed,
                            property);

                        this._changes.properties.set(property.key, currentPropertyChanges);
                    }
                    else
                    {
                        currentPropertyChanges = new ObjectVariablePropertyChange(
                            ObjectVariablePropertyChangeType.Restored,
                            property);

                        this._changes.properties.delete(property.key);
                    }

                    // TODO: these property change events shouldn't be published, when the object itself is being reset
                    // otherwise we will have unnecessary(?) duplicates
                    const propertyEvent = new VariableChangeEvent(
                        currentPropertyChanges,
                        e!);

                    this.publishChange(propertyEvent);
                });
            this._propertyChangeListeners.push(listener);
        }
    }

    public detectChanges(): void
    {
        super.detectChanges();
        const changes = this._updateChanges(this.linkedVariable!.value);
        this._publishObjectChange(changes, null);
    }

    public areEqual(first: ObjectVariableValue, second: ObjectVariableValue): boolean
    {
        return first.equals(second, (f, s, n) =>
            {
                const property = this._properties!.tryGet(n);
                return isNull(property) ?
                    f[n] === s[n] :
                    property.changeTracker.areEqual(f[n], s[n]);
            });
    }

    public getChangedProperties(): Iterable<MapEntry<string, IVariable>>
    {
        return Iteration.Map(
            this._changes.properties.keys(),
            k => makeMapEntry(k, this._properties!.get(k)));
    }

    public getUnchagedProperties(): Iterable<MapEntry<string, IVariable>>
    {
        return Iteration.FilterNotNull(
            Iteration.LeftJoin(
                this._properties!, p => p.key,
                this._changes.properties.keys(), k => k,
                (p, k) => isNull(k) ? makeMapEntry(p.key, p.value) : null));
    }

    private _updateChanges(currentValue: ObjectVariableValue): ReadonlyArray<ObjectVariablePropertyChange>
    {
        this._changes.currentValue = currentValue;
        const changes: ObjectVariablePropertyChange[] = [];

        for (const property of this._properties!)
        {
            const variable = property.value;
            const currentChange = this._changes.properties.tryGet(property.key);

            if (variable.changeTracker.hasChanged)
            {
                const newChange = new ObjectVariablePropertyChange(
                    ObjectVariablePropertyChangeType.Changed,
                    property);

                this._changes.properties.set(property.key, newChange);

                if (isNull(currentChange) || !variable.changeTracker.areEqual(variable.value, currentChange.currentValue))
                    changes.push(newChange);
            }
            else if (!isNull(currentChange))
            {
                const restoredChange = new ObjectVariablePropertyChange(
                    ObjectVariablePropertyChangeType.Restored,
                    property);

                this._changes.properties.delete(property.key);
                changes.push(restoredChange);
            }
        }
        return changes;
    }

    private _publishObjectChange(changes: ReadonlyArray<ObjectVariablePropertyChange>, source: Nullable<object>): void
    {
        if (changes.length === 0)
            return;

        const event = new VariableChangeEvent(
            changes,
            source);

        this.publishChange(event);
    }
}
