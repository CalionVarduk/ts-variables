import { IDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { IVariable } from './variable.interface';
import { IVariableChangeTracker } from './variable-change-tracker.interface';
import { IVariableValidator } from './variable-validator.interface';
import { VariableChangeTrackerBase } from './variable-change-tracker-base.abstract';
import { VariableValidatorBase } from './variable-validator-base.abstract';

export abstract class VariableBase<T = any>
    implements
    IVariable<T>,
    IDisposable
{
    public abstract get value(): T;

    public get isDisposed(): boolean
    {
        return this._isDisposed;
    }

    public get changeTracker(): IVariableChangeTracker<T>
    {
        return this._changeTracker;
    }

    public get validator(): IVariableValidator
    {
        return this._validator;
    }

    private readonly _changeTracker: VariableChangeTrackerBase<T>;
    private readonly _validator: VariableValidatorBase<T>;
    private _isDisposed: boolean;

    protected constructor(changeTracker: VariableChangeTrackerBase<T>, validator: VariableValidatorBase<T>)
    {
        this._changeTracker = changeTracker;
        this._validator = validator;
        this._isDisposed = false;
    }

    public dispose(): void
    {
        this._changeTracker.dispose();
        this._validator.dispose();
        this._isDisposed = true;
    }

    public abstract reset(): void;
}
