import { Nullable, DeepReadonly, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isNull, Assert, isDefined, deepReadonlyCast, isInstanceOfType } from 'frl-ts-utils/lib/functions';
import { UnorderedMap, IReadonlyKeyedCollection, Iteration } from 'frl-ts-utils/lib/collections';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableValidatorBase } from '../variable-validator-base.abstract';
import { ICollectionVariableValidator } from './collection-variable-validator.interface';
import { CollectionVariableValidatorState } from './collection-variable-validator-state';
import { IReadonlyCollectionVariable } from './readonly-collection-variable.interface';
import { CollectionVariableValidatedEvent } from './collection-variable-validated-event';
import { VariableBase } from '../variable-base.abstract';
import { VariableValidationParams } from '../variable-validation-params';
import { VariableValidatorCallback } from '../variable-validator-callback';
import { VariableValidatorAsyncCallback } from '../variable-validator-async-callback';
import { VariableValidationCallbackAction } from '../variable-validation-callback-action';
import { VariableValidationCallbackAsyncAction } from '../variable-validation-callback-async-action';
import { VariableValidationResult } from '../variable-validation-result';
import { VariableValidatorFinishMode } from '../variable-validator-finish-mode.enum';
import { CollectionVariableElementValidatorState } from './collection-variable-element-validator-state';
import { CollectionVariableElementValidatedEvent } from './collection-variable-element-validated-event';

class MutableCollectionVariableValidatorState<TKey, TElement>
    extends
    CollectionVariableValidatorState<TKey, TElement>
{
    public static CreateEmpty<K, E>(): MutableCollectionVariableValidatorState<K, E>
    {
        return new MutableCollectionVariableValidatorState<K, E>(null, null);
    }

    public static Create<K, E>(
        previous: MutableCollectionVariableValidatorState<K, E>,
        value: IReadonlyKeyedCollection<K, E>,
        result: Nullable<VariableValidationResult>):
        MutableCollectionVariableValidatorState<K, E>
    {
        const state = isNull(result) ?
            MutableCollectionVariableValidatorState.CreateEmpty<K, E>() :
            new MutableCollectionVariableValidatorState<K, E>(result.errors, result.warnings);

        state.currentValue = value;
        state.invalidElements = previous.invalidElements;
        state.elementsWithWarnings = previous.elementsWithWarnings;
        return state;
    }

    public static Reset<K, E>(
        previous: MutableCollectionVariableValidatorState<K, E>):
        MutableCollectionVariableValidatorState<K, E>
    {
        const state = MutableCollectionVariableValidatorState.CreateEmpty<K, E>();
        state.invalidElements = previous.invalidElements;
        state.elementsWithWarnings = previous.elementsWithWarnings;
        return state;
    }

    public get currentValue(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return reinterpretCast<IReadonlyKeyedCollection<TKey, TElement>>(this._currentValue);
    }
    public set currentValue(value: IReadonlyKeyedCollection<TKey, TElement>)
    {
        this._currentValue = value;
    }

    public get invalidElements(): UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>
    {
        return reinterpretCast<UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>>(this._invalidElements);
    }
    public set invalidElements(value: UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>)
    {
        this._invalidElements = value;
    }

    public get elementsWithWarnings(): UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>
    {
        return reinterpretCast<UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>>(this._elementsWithWarnings);
    }
    public set elementsWithWarnings(value: UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>)
    {
        this._elementsWithWarnings = value;
    }

    public readonly errors: Nullable<ReadonlyArray<string>>;
    public readonly warnings: Nullable<ReadonlyArray<string>>;

    private _currentValue: Nullable<IReadonlyKeyedCollection<TKey, TElement>>;
    private _invalidElements: Nullable<UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>>;
    private _elementsWithWarnings: Nullable<UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>>;

    public constructor(errors: Nullable<ReadonlyArray<string>>, warnings: Nullable<ReadonlyArray<string>>)
    {
        super();
        this.errors = errors;
        this.warnings = warnings;
        this._currentValue = null;
        this._invalidElements = null;
        this._elementsWithWarnings = null;
    }
}

export type CollectionVariableValidatorParams<TKey = any, TElement = any> =
{
    readonly attach?: boolean;
    readonly validateImmediately?: boolean;
    readonly listenToInternalChanges?: boolean;
    readonly alwaysFinishSyncValidation?: boolean;
    readonly callbacks?: Iterable<VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>>;
    readonly asyncCallbacks?: Iterable<VariableValidatorAsyncCallback<IReadonlyKeyedCollection<TKey, TElement>>>;
};

export class CollectionVariableValidator<TKey = any, TElement = any>
    extends
    VariableValidatorBase<IReadonlyKeyedCollection<TKey, TElement>>
    implements
    ICollectionVariableValidator<TKey, TElement>
{
    public get isValid(): boolean
    {
        return super.isValid && this._state.invalidElements.length === 0;
    }

    public get hasWarnings(): boolean
    {
        return super.hasWarnings || this._state.elementsWithWarnings.length > 0;
    }

    public get state(): CollectionVariableValidatorState<TKey, TElement>
    {
        return this._state;
    }

    protected get linkedVariable(): Nullable<IReadonlyCollectionVariable<TKey, TElement>>
    {
        return reinterpretCast<Nullable<IReadonlyCollectionVariable<TKey, TElement>>>(super.linkedVariable);
    }

    public readonly isListeningToInternalChanges: boolean;

    private readonly _validateImmediately: boolean;
    private readonly _collectionListeners: IEventListener[];
    private _state: MutableCollectionVariableValidatorState<TKey, TElement>;
    private _elementValidationListeners: Nullable<UnorderedMap<TKey, IEventListener>>;

    public constructor(params?: CollectionVariableValidatorParams<TKey, TElement>)
    {
        if (!isDefined(params))
            params = {};

        const callbacks = isDefined(params.callbacks) ? Iteration.ToArray(params.callbacks) : [];
        const asyncCallbacks = isDefined(params.asyncCallbacks) ? Iteration.ToArray(params.asyncCallbacks) : [];

        super({
            attach: params.attach,
            alwaysFinishSyncValidation: params.alwaysFinishSyncValidation,
            validationAction: callbacks.length > 0 ?
                new VariableValidationCallbackAction<IReadonlyKeyedCollection<TKey, TElement>>(callbacks) :
                null,
            asyncValidationAction: asyncCallbacks.length > 0 ?
                new VariableValidationCallbackAsyncAction<IReadonlyKeyedCollection<TKey, TElement>>(asyncCallbacks) :
                null
        });

        this._collectionListeners = [];
        this._validateImmediately = isDefined(params.validateImmediately) ? params.validateImmediately : true;
        this.isListeningToInternalChanges = isDefined(params.listenToInternalChanges) ? params.listenToInternalChanges : true;
        this._elementValidationListeners = null;
        this._state = MutableCollectionVariableValidatorState.CreateEmpty<TKey, TElement>();
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        for (const listener of this._collectionListeners)
            listener.dispose();

        if (!isNull(this._elementValidationListeners))
        {
            for (const listener of this._elementValidationListeners.values())
                listener.dispose();

            this._elementValidationListeners.clear();
        }

        this._collectionListeners.splice(0);
        this._state.invalidElements.clear();
        this._state.elementsWithWarnings.clear();
        this._state = MutableCollectionVariableValidatorState.Reset(this._state);
        super.dispose();
    }

    public configure(linkedVariable: IReadonlyCollectionVariable<TKey, TElement>): void
    {
        super.configure(linkedVariable);

        this._state.invalidElements = new UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>(
            linkedVariable.value.primaryLookup.keyStringifier);

        this._state.elementsWithWarnings = new UnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>(
            linkedVariable.value.primaryLookup.keyStringifier);

        this._elementValidationListeners = new UnorderedMap<TKey, IEventListener>(
            linkedVariable.value.primaryLookup.keyStringifier);

        this._updateState(linkedVariable.value);

        if (this._validateImmediately)
            this.beginValidation(linkedVariable.value, null);

        this._collectionListeners.push(
            this._configureElementsAddedListener(),
            this._configureElementsRemovedListener(),
            this._configureElementsReplacedListener(),
            this._configureElementsSetListener(),
            this._configureCollectionRecreatedListener());
    }

    public getValidElements(): Iterable<TElement>
    {
        return Iteration.FilterNotNull(
            Iteration.LeftJoin(
                this._state.currentValue, e => reinterpretCast<DeepReadonly<TKey>>(e.key),
                this._state.invalidElements.keys(), k => reinterpretCast<DeepReadonly<TKey>>(k),
                (e, k) => isNull(k) ? e.value : null,
                this._state.currentValue.primaryLookup.keyStringifier));
    }

    public getInvalidElements(): Iterable<TElement>
    {
        return Iteration.Map(
            this._state.invalidElements.values(),
            e => deepReadonlyCast(e.element));
    }

    public getElementsWithWarnings(): Iterable<TElement>
    {
        return Iteration.Map(
            this._state.elementsWithWarnings.values(),
            e => deepReadonlyCast(e.element));
    }

    protected startDetachedValidation(): VariableValidationParams
    {
        this._updateState(this.linkedVariable!.value);
        const result: VariableValidationParams = {
            value: this.linkedVariable!.value,
            args: null
        };
        return result;
    }

    protected finishValidation(
        result: Nullable<VariableValidationResult>,
        _0: VariableValidatorFinishMode,
        value: IReadonlyKeyedCollection<TKey, TElement>,
        args?: any):
        void
    {
        this._state = MutableCollectionVariableValidatorState.Create(this._state, value, result);

        const event = new CollectionVariableValidatedEvent<TKey, TElement>(
            this.isValid,
            this.hasWarnings,
            this.state,
            args);

        this.publishValidated(event);
    }

    private _configureElementsAddedListener(): IEventListener
    {
        return this.linkedVariable!.onElementsAdded.listen((_, e) =>
            {
                if (!this.isAttached)
                    return;

                if (this.isListeningToInternalChanges)
                {
                    for (const element of e!.addedElements)
                    {
                        const key = this._getElementKey(element);
                        this._handleElementAddition(key, element);
                    }
                }
                this.beginValidation(e!.currentValue, e);
            });
    }

    private _configureElementsRemovedListener(): IEventListener
    {
        return this.linkedVariable!.onElementsRemoved.listen((_, e) =>
            {
                if (!this.isAttached)
                    return;

                if (this.isListeningToInternalChanges)
                {
                    for (const element of e!.removedElements)
                    {
                        const key = this._getElementKey(element);
                        this._handleElementRemoval(key);
                    }
                }
                this.beginValidation(e!.currentValue, e);
            });
    }

    private _configureElementsReplacedListener(): IEventListener
    {
        return this.linkedVariable!.onElementsReplaced.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            if (this.isListeningToInternalChanges)
            {
                for (const element of e!.replacedElements)
                {
                    const key = this._getElementKey(element.value);
                    this._handleElementAddition(key, element.value);
                }
            }
            this.beginValidation(e!.currentValue, e);
        });
    }

    private _configureElementsSetListener(): IEventListener
    {
        return this.linkedVariable!.onElementsSet.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            if (this.isListeningToInternalChanges)
            {
                for (const element of e!.addedElements)
                {
                    const key = this._getElementKey(element);
                    this._handleElementAddition(key, element);
                }
                for (const element of e!.replacedElements)
                {
                    const key = this._getElementKey(element.value);
                    this._handleElementAddition(key, element.value);
                }
            }
            this.beginValidation(e!.currentValue, e);
        });
    }

    private _configureCollectionRecreatedListener(): IEventListener
    {
        return this.linkedVariable!.onRecreated.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            this._updateState(e!.currentValue);
            this.beginValidation(e!.currentValue, e);
        });
    }

    private _updateState(value: IReadonlyKeyedCollection<TKey, TElement>): void
    {
        this._state.currentValue = value;

        if (this.isListeningToInternalChanges)
        {
            for (const listener of this._elementValidationListeners!.values())
                listener.dispose();

            // TODO: optimize this maybe...?
            // remove only listeners from removed elements
            // add new listeners to added/replaced elements (for replaced, remove current listener first)
            this._elementValidationListeners!.clear();
            this._state.invalidElements.clear();
            this._state.elementsWithWarnings.clear();

            for (const entry of value)
            {
                const key = entry.key;
                const element = entry.value;
                this._handleElementAddition(key, element);
            }
        }
    }

    private _handleElementAddition(key: DeepReadonly<TKey>, element: TElement): void
    {
        this._handleElementRemoval(key);
        this._tryAddElementValidationListener(key, element);
    }

    private _handleElementRemoval(key: DeepReadonly<TKey>): void
    {
        this._state.invalidElements.tryDelete(key);
        this._state.elementsWithWarnings.tryDelete(key);
        this._tryDisposeElementValidationListener(key);
    }

    private _tryAddElementValidationListener(key: DeepReadonly<TKey>, element: TElement): void
    {
        if (!isInstanceOfType(VariableBase, element))
            return;

        if (!element.validator.isValid)
        {
            const elementState = new CollectionVariableElementValidatorState<TKey, TElement>(key, element);
            this._state.invalidElements.set(key, elementState);
        }
        if (element.validator.hasWarnings)
        {
            const elementState = new CollectionVariableElementValidatorState<TKey, TElement>(key, element);
            this._state.elementsWithWarnings.set(key, elementState);
        }

        const listener = element.validator.onValidated.listen((_, e) =>
            {
                if (!this.isAttached)
                    return;

                const wasValid = !this._state.invalidElements.has(key);

                if (e!.isValid)
                    this._state.invalidElements.tryDelete(key);
                else
                {
                    const elementState = new CollectionVariableElementValidatorState<TKey, TElement>(key, element);
                    this._state.invalidElements.set(key, elementState);
                }

                if (e!.hasWarnings)
                {
                    const elementState = new CollectionVariableElementValidatorState<TKey, TElement>(key, element);
                    this._state.elementsWithWarnings.set(key, elementState);
                }
                else
                    this._state.elementsWithWarnings.tryDelete(key);

                const event = new CollectionVariableElementValidatedEvent<TKey, TElement>(
                    key,
                    element,
                    wasValid !== e!.isValid,
                    this.isValid,
                    this.hasWarnings,
                    this._state,
                    e!);

                this.publishValidated(event);
            });

        this._elementValidationListeners!.set(key, listener);
    }

    private _tryDisposeElementValidationListener(key: DeepReadonly<TKey>): void
    {
        const oldListener = this._elementValidationListeners!.tryGet(key);
        if (!isNull(oldListener))
        {
            oldListener.dispose();
            this._elementValidationListeners!.delete(key);
        }
    }

    private _getElementKey(element: TElement): DeepReadonly<TKey>
    {
        return this._state.currentValue!.primaryLookup.getEntityKey(toDeepReadonly(element));
    }
}
