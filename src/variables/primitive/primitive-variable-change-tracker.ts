import { Nullable, DeepReadonly, Ensured, Undefinable } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, isNull, isUndefined } from 'frl-ts-utils/lib/functions';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableChangeTrackerBase } from '../variable-change-tracker-base.abstract';
import { IPrimitiveVariableChangeTracker } from './primitive-variable-change-tracker.interface';
import { PrimitiveVariableChanges } from './primitive-variable-changes';
import { IReadonlyPrimitiveVariable } from './readonly-primitive-variable.interface';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';
import { PrimitiveVariableChangeEvent } from './primitive-variable-change-event';

export type PrimitiveVariableChangeTrackerParams<T = any> =
{
    readonly attach?: boolean;
    readonly originalValue?: Nullable<DeepReadonly<T>>;
    equalityComparer?(first: Ensured<DeepReadonly<T>>, second: Ensured<DeepReadonly<T>>): boolean;
};

export class PrimitiveVariableChangeTracker<T = any>
    extends
    VariableChangeTrackerBase<Nullable<DeepReadonly<T>>>
    implements
    IPrimitiveVariableChangeTracker<T>
{
    public get hasChanged(): boolean
    {
        return this._hasChanged;
    }

    public get changes(): Nullable<PrimitiveVariableChanges<T>>
    {
        return this._hasChanged ? this._changes : null;
    }

    protected get linkedVariable(): Nullable<IReadonlyPrimitiveVariable<T>>
    {
        return reinterpretCast<Nullable<IReadonlyPrimitiveVariable<T>>>(super.linkedVariable);
    }

    public readonly originalValue: Nullable<DeepReadonly<T>>;

    protected readonly equalityComparer: Undefinable<(first: Ensured<DeepReadonly<T>>, second: Ensured<DeepReadonly<T>>) => boolean>;

    private _changes: PrimitiveVariableChanges<T>;
    private _changeListener: Nullable<IEventListener<PrimitiveVariableValueChangedEvent<T>>>;
    private _hasChanged: boolean;

    public constructor(params?: PrimitiveVariableChangeTrackerParams<T>)
    {
        if (!isDefined(params))
            params = {};

        super(params.attach);

        this.originalValue = isDefined(params.originalValue) ? params.originalValue : null;
        this._changes = new PrimitiveVariableChanges(
            this.originalValue,
            this.originalValue);

        this._hasChanged = false;

        this.equalityComparer = params.equalityComparer;
        this._changeListener = null;
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
        this._changes = new PrimitiveVariableChanges(
            this.originalValue,
            this.originalValue);

        this._hasChanged = false;

        super.dispose();
    }

    public configure(linkedVariable: IReadonlyPrimitiveVariable<T>): void
    {
        super.configure(linkedVariable);

        this._updateChanges(linkedVariable.value);

        this._changeListener = linkedVariable.onValueChanged.listen((_, e) =>
            {
                if (!this.isAttached || this._changes.currentValue === e!.currentValue)
                    return;

                this._updateChangesAndPublish(e!.currentValue, e!);
            });
    }

    public detectChanges(): void
    {
        super.detectChanges();

        if (this._changes.currentValue === this.linkedVariable!.value)
            return;

        this._updateChangesAndPublish(this.linkedVariable!.value, null);
    }

    public areEqual(first: Nullable<DeepReadonly<T>>, second: Nullable<DeepReadonly<T>>): boolean
    {
        return first === second ||
        (
            isDefined(first) &&
            isDefined(second) &&
            !isUndefined(this.equalityComparer) &&
            this.equalityComparer(first!, second!)
        );
    }

    private _updateChanges(currentValue: Nullable<DeepReadonly<T>>): void
    {
        this._hasChanged = !this.areEqual(this.originalValue, currentValue);
        this._changes = new PrimitiveVariableChanges(
            this.originalValue,
            currentValue);
    }

    private _updateChangesAndPublish(
        currentValue: Nullable<DeepReadonly<T>>,
        eventSource: Nullable<PrimitiveVariableValueChangedEvent<T>>):
        void
    {
        this._updateChanges(currentValue);
        const event = new PrimitiveVariableChangeEvent<T>(
            this.changes,
            eventSource);

        this.publishChange(event);
    }
}
