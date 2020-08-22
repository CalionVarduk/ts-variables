import { Nullable } from 'frl-ts-utils/lib/types';
import { isDefined, Assert, isNull } from 'frl-ts-utils/lib/functions';
import { IDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { IEvent, EventHandler } from 'frl-ts-utils/lib/events';
import { IVariableChangeTracker } from './variable-change-tracker.interface';
import { VariableChangeEvent } from './variable-change-event';
import { IVariable } from './variable.interface';

export abstract class VariableChangeTrackerBase<T = any>
    implements
    IVariableChangeTracker<T>,
    IDisposable
{
    public get isDisposed(): boolean
    {
        return this._onChange.isDisposed;
    }

    public get isAttached(): boolean
    {
        return this._isAttached;
    }

    public abstract get originalValue(): T;
    public abstract get changes(): Nullable<object>;

    public get onChange(): IEvent<VariableChangeEvent>
    {
        return this._onChange;
    }

    public abstract get hasChanged(): boolean;

    protected get linkedVariable(): Nullable<IVariable<T>>
    {
        return this._linkedVariable;
    }

    private readonly _onChange: EventHandler<VariableChangeEvent>;

    private _linkedVariable: Nullable<IVariable<T>>;
    private _isAttached: boolean;

    protected constructor(attach?: boolean)
    {
        this._onChange = new EventHandler<VariableChangeEvent>();
        this._linkedVariable = null;
        this._isAttached = isDefined(attach) ? attach : true;
    }

    public dispose(): void
    {
        this._linkedVariable = null;
        this._isAttached = false;
        this._onChange.dispose();
    }

    public configure(linkedVariable: IVariable<T>): void
    {
        Assert.False(this.isDisposed, 'change tracker has been disposed');
        Assert.True(isNull(this._linkedVariable), 'change tracker has already been configured');
        this._linkedVariable = linkedVariable;
    }

    public abstract areEqual(first: T, second: T): boolean;

    public detach(): void
    {
        Assert.False(this.isDisposed, 'change tracker has been disposed');
        this._isAttached = false;
    }

    public attach(): void
    {
        Assert.False(this.isDisposed, 'change tracker has been disposed');
        if (this._isAttached)
            return;

        this._isAttached = true;
        this.detectChanges();
    }

    public detectChanges(): void
    {
        Assert.False(this.isDisposed, 'change tracker has been disposed');
        Assert.False(isNull(this._linkedVariable), 'change tracker must be configured first');
    }

    protected publishChange(e: VariableChangeEvent): void
    {
        this._onChange.publish(this, e);
    }
}
