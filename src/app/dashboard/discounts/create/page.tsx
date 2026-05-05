"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeftIcon, CheckIcon, Loader2Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

type Step = "info" | "stores" | "conditions" | "schedule" | "review"

const STEPS: Array<{ id: Step; label: string; num: number }> = [
  { id: "info", label: "Discount Information", num: 1 },
  { id: "stores", label: "Select Stores", num: 2 },
  { id: "conditions", label: "Set Conditions", num: 3 },
  { id: "schedule", label: "Schedule", num: 4 },
  { id: "review", label: "Review", num: 5 },
]

interface ProductCollection {
  id: string
  name: string
  description?: string
}

interface StoreEntity {
  id: string
  name: string
}

interface DiscountFormData {
  title: string
  amount: string
  method: "DOLLAR" | "PERCENT"
  isCart: boolean
  isStackable: boolean
  requireReason: boolean
  requirePin: boolean
  hideDiscountButton: boolean
  isActive: boolean
  isTreezLoyalty: boolean
  coupons: Array<{ code: string; title: string }>
  selectedStores: StoreEntity[]
  selectedCollections: ProductCollection[]
  perCustomerLimit: string
  purchaseMinimum: string
  purchaseMinimumType: "GRANDTOTAL" | "SUBTOTAL"
  itemLimit: string
  fulfillmentTypes: {
    IN_STORE: boolean
    DELIVERY: boolean
    PICKUP: boolean
    EXPRESS: boolean
  }
  schedule: {
    enabled: boolean
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    allDay: boolean
    repeatType: "NEVER" | "DAY" | "WEEK" | "CUSTOM"
    customRepeatEvery: "DAY" | "WEEK"
    customRepeatIntervalCount: string
    customRepeatDaysOfWeek: {
      SUN: boolean
      MON: boolean
      TUE: boolean
      WED: boolean
      THU: boolean
      FRI: boolean
      SAT: boolean
    }
    customEndType: "NEVER" | "ON_DATE" | "AFTER_COUNT"
    customEndDate: string
    customEndRepeatCount: string
  }
}

const DEFAULT_FORM_DATA: DiscountFormData = {
  title: "",
  amount: "",
  method: "DOLLAR",
  isCart: true,
  isStackable: false,
  requireReason: false,
  requirePin: false,
  hideDiscountButton: false,
  isActive: true,
  isTreezLoyalty: false,
  coupons: [],
  selectedStores: [],
  selectedCollections: [],
  perCustomerLimit: "",
  purchaseMinimum: "",
  purchaseMinimumType: "GRANDTOTAL",
  itemLimit: "",
  fulfillmentTypes: {
    IN_STORE: false,
    DELIVERY: false,
    PICKUP: false,
    EXPRESS: false,
  },
  schedule: {
    enabled: false,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    allDay: true,
    repeatType: "NEVER",
    customRepeatEvery: "DAY",
    customRepeatIntervalCount: "1",
    customRepeatDaysOfWeek: {
      SUN: false,
      MON: false,
      TUE: false,
      WED: false,
      THU: false,
      FRI: false,
      SAT: false,
    },
    customEndType: "NEVER",
    customEndDate: "",
    customEndRepeatCount: "",
  },
}

export default function CreateDiscountPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState<Step>("info")
  const [formData, setFormData] = React.useState<DiscountFormData>(DEFAULT_FORM_DATA)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [newCouponCode, setNewCouponCode] = React.useState("")
  const [newCouponTitle, setNewCouponTitle] = React.useState("")
  
  const [collections, setCollections] = React.useState<ProductCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = React.useState(false)
  const [collectionSearch, setCollectionSearch] = React.useState("")
  
  const [stores, setStores] = React.useState<StoreEntity[]>([])
  const [storesLoading, setStoresLoading] = React.useState(false)

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const isLastStep = currentStep === "review"

  React.useEffect(() => {
    fetchCollections()
    fetchStores()
  }, [])

  const fetchCollections = async () => {
    setCollectionsLoading(true)
    try {
      const res = await fetch("/api/collections")
      if (res.ok) {
        const data = await res.json()
        const collectionsData = data.data || data.collections || data
        const parsed: ProductCollection[] = Array.isArray(collectionsData)
          ? collectionsData.map((c: any) => ({
              id: c.id || c.collectionId || c.productCollectionId || String(c),
              name: c.name || c.title || c.displayName || c.id || String(c),
              description: c.description || c.desc,
            }))
          : []
        setCollections(parsed)
      }
    } catch (e) {
      console.error("Failed to fetch collections:", e)
    } finally {
      setCollectionsLoading(false)
    }
  }

  const fetchStores = async () => {
    setStoresLoading(true)
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const data = await res.json()
        // Parse the response - could be in data.data, data.entities, or root array
        let storesData = data.data || data.entities || data
        
        // If it's an object with nested data, try to extract array
        if (storesData && typeof storesData === 'object' && !Array.isArray(storesData)) {
          storesData = storesData.data || storesData.entities || storesData.results || []
        }
        
        const parsed: StoreEntity[] = Array.isArray(storesData)
          ? storesData.map((s: any) => ({
              id: s.id || s.entityId || s.organizationEntityId || String(s),
              name: s.name || s.displayName || s.entityName || s.organizationEntityName || s.id || String(s),
            }))
          : []
        setStores(parsed)
      }
    } catch (e) {
      console.error("Failed to fetch stores:", e)
    } finally {
      setStoresLoading(false)
    }
  }

  const updateFormData = (updates: Partial<DiscountFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id)
    } else {
      router.push("/dashboard")
    }
  }

  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit()
    } else {
      setCurrentStep(STEPS[currentStepIndex + 1].id)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        amount: formData.amount,
        method: formData.method,
        isActive: formData.isActive,
        isManual: true,
        isCart: formData.isCart,
        isStackable: formData.isStackable,
        isAdjustment: false,
        requireReason: formData.requireReason,
        requirePin: formData.requirePin,
        requireCoupon: formData.coupons.length > 0,
      }

      if (formData.selectedStores.length > 0) {
        payload.storeCustomizations = formData.selectedStores.map((s) => ({ 
          entityId: s.id 
        }))
      }

      if (formData.selectedCollections.length > 0) {
        payload.collections = formData.selectedCollections.map((c) => ({ 
          productCollectionId: c.id 
        }))
      }

      if (formData.coupons.length > 0) {
        payload.coupons = formData.coupons.map(c => ({
          code: c.code,
          title: c.title || c.code,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }))
      }

      // Always include conditions with all required flags
      payload.conditions = {
        customerCapEnabled: !!formData.perCustomerLimit,
        customerCapValue: parseInt(formData.perCustomerLimit) || 0,
        customerLimitEnabled: false,
        customerLimitValue: 0,
        purchaseMinimumEnabled: !!formData.purchaseMinimum,
        purchaseMinimumValue: parseFloat(formData.purchaseMinimum) || 0,
        purchaseMinimumType: formData.purchaseMinimumType,
        customerEventEnabled: false,
        itemLimitEnabled: !!formData.itemLimit,
        itemLimitValue: parseInt(formData.itemLimit) || 0,
        fulfillmentTypesEnabled: Object.values(formData.fulfillmentTypes).some(Boolean),
        fulfillmentTypes: formData.fulfillmentTypes,
        customerLicenseTypeEnabled: false,
        packageAgeEnabled: false,
      }

      // Add schedule if enabled
      if (formData.schedule.enabled) {
        const schedule: Record<string, unknown> = {
          startDate: formData.schedule.startDate,
          startTime: formData.schedule.startTime || "00:00",
          endDate: formData.schedule.endDate,
          endTime: formData.schedule.endTime || "23:59",
          allDay: formData.schedule.allDay,
          spansMultipleDays: false,
        }

        if (formData.schedule.repeatType === "DAY") {
          schedule.repeatType = "DAY"
        } else if (formData.schedule.repeatType === "WEEK") {
          schedule.repeatType = "WEEK"
        } else if (formData.schedule.repeatType === "CUSTOM") {
          schedule.customRepeatEvery = formData.schedule.customRepeatEvery
          schedule.customRepeatIntervalCount = parseInt(formData.schedule.customRepeatIntervalCount) || 1
          schedule.customRepeatDaysOfWeek = formData.schedule.customRepeatDaysOfWeek
          schedule.customEndType = formData.schedule.customEndType
          if (formData.schedule.customEndType === "ON_DATE") {
            schedule.customEndDate = formData.schedule.customEndDate
          } else if (formData.schedule.customEndType === "AFTER_COUNT") {
            schedule.customEndRepeatCount = parseInt(formData.schedule.customEndRepeatCount) || 0
          }
        }

        payload.schedule = schedule
      }

      const res = await fetch("/api/discounts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorDetails = data.details ? JSON.stringify(data.details, null, 2) : data.error
        throw new Error(errorDetails || "Failed to create discount")
      }

      // Show success toast
      toast.success("Discount created successfully!", {
        description: `"${formData.title}" has been created and is now active.`,
        duration: 4000,
      })

      // Redirect to dashboard immediately
      router.push("/dashboard")
    } catch (e) {
      setError((e as Error).message)
      toast.error("Failed to create discount", {
        description: (e as Error).message,
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleStore = (store: StoreEntity) => {
    const isSelected = formData.selectedStores.some((s) => s.id === store.id)
    updateFormData({
      selectedStores: isSelected
        ? formData.selectedStores.filter((s) => s.id !== store.id)
        : [...formData.selectedStores, store],
    })
  }

  const selectAllStores = () => {
    updateFormData({ selectedStores: [...stores] })
  }

  const clearAllStores = () => {
    updateFormData({ selectedStores: [] })
  }

  const addCoupon = () => {
    if (newCouponCode.trim()) {
      updateFormData({
        coupons: [...formData.coupons, { 
          code: newCouponCode.trim(), 
          title: newCouponTitle.trim() || newCouponCode.trim() 
        }],
      })
      setNewCouponCode("")
      setNewCouponTitle("")
    }
  }

  const removeCoupon = (index: number) => {
    updateFormData({
      coupons: formData.coupons.filter((_, i) => i !== index),
    })
  }

  const toggleCollection = (collection: ProductCollection) => {
    const isSelected = formData.selectedCollections.some((c) => c.id === collection.id)
    updateFormData({
      selectedCollections: isSelected
        ? formData.selectedCollections.filter((c) => c.id !== collection.id)
        : [...formData.selectedCollections, collection],
    })
  }

  const filteredCollections = React.useMemo(() => {
    if (!collectionSearch.trim()) return collections
    const search = collectionSearch.toLowerCase()
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search)
    )
  }, [collections, collectionSearch])

  return (
    <DashboardShell
      headerActions={
        <Button
          onClick={handleBack}
          variant="ghost"
          className="gap-2"
          disabled={loading}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0C3D22] text-white font-mono text-sm">
                $
              </span>
              Add Manual Discount
            </h1>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm text-destructive"
            >
              <p className="font-semibold">Error creating discount</p>
              <pre className="mt-2 font-mono text-xs leading-relaxed opacity-90 whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            {/* Left sidebar - Steps */}
            <div className="flex flex-col gap-2">
              {STEPS.map((step, idx) => {
                const isActive = step.id === currentStep
                const isCompleted = idx < currentStepIndex
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    disabled={loading}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-[#0C3D22] text-white"
                        : isCompleted
                          ? "bg-[#0C3D22]/10 text-foreground hover:bg-[#0C3D22]/20"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isActive
                          ? "bg-white text-[#0C3D22]"
                          : isCompleted
                            ? "bg-[#0C3D22] text-white"
                            : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <CheckIcon className="size-4" /> : step.num}
                    </div>
                    <span className="text-sm font-medium">{step.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Right content - Form */}
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
              {/* Discount Information Step - Keeping existing content */}
              {currentStep === "info" && (
                <div className="space-y-6">
                  {/* ... keeping all the existing discount info fields ... */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Manual Discount Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Discount Title *
                        </Label>
                        <p className="text-xs text-muted-foreground mb-2">*Field Required</p>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => updateFormData({ title: e.target.value })}
                          placeholder="Enter discount title"
                          className="bg-muted/30"
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          Global discount conditions
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">*Field Required</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <select
                              value={formData.method}
                              onChange={(e) => updateFormData({ method: e.target.value as "DOLLAR" | "PERCENT" })}
                              className="h-9 w-full appearance-none rounded-lg border border-border bg-muted/30 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="DOLLAR">$</option>
                              <option value="PERCENT">%</option>
                            </select>
                          </div>
                          <Input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => updateFormData({ amount: e.target.value })}
                            placeholder="Amount *"
                            className="bg-muted/30"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="stackable"
                          checked={formData.isStackable}
                          onCheckedChange={(checked) => updateFormData({ isStackable: checked === true })}
                        />
                        <Label htmlFor="stackable" className="text-sm font-medium cursor-pointer">
                          Stackable discount
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When enabled, this discount can be combined with any automated discount, even those marked as
                        unstackable. When disabled, it cannot be combined with any automated discount.
                      </p>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">Discount Type</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Select your discount type. Line item discount for individual items or cart discount for the whole
                          cart value. Price At must be line item discounts. Coupons can only be applied to cart discounts.
                        </p>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="discountType"
                              checked={formData.isCart}
                              onChange={() => updateFormData({ isCart: true })}
                              className="h-4 w-4 text-[#0C3D22] focus:ring-[#0C3D22]"
                            />
                            <span className="text-sm">This is a cart discount</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="discountType"
                              checked={!formData.isCart}
                              onChange={() => updateFormData({ isCart: false })}
                              className="h-4 w-4 text-[#0C3D22] focus:ring-[#0C3D22]"
                            />
                            <span className="text-sm">This is a line item discount</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          Discount Requirements
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Select the discount requirements to be applied in the POS.
                        </p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              id="hideButton"
                              checked={formData.hideDiscountButton}
                              onCheckedChange={(checked) => updateFormData({ hideDiscountButton: checked === true })}
                            />
                            <span className="text-sm">Hide Discount Button in POS</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              id="requirePin"
                              checked={formData.requirePin}
                              onCheckedChange={(checked) => updateFormData({ requirePin: checked === true })}
                            />
                            <span className="text-sm">Require manager PIN</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              id="requireReason"
                              checked={formData.requireReason}
                              onCheckedChange={(checked) => updateFormData({ requireReason: checked === true })}
                            />
                            <span className="text-sm">Require reason</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">External Loyalty</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox 
                            id="isTreez"
                            checked={formData.isTreezLoyalty}
                            onCheckedChange={(checked) => updateFormData({ isTreezLoyalty: checked === true })}
                          />
                          <span className="text-sm">Is Treez Loyalty?</span>
                        </label>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">Product Collections</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Select product collections to apply this discount only to specific products
                        </p>
                        
                        {collectionsLoading ? (
                          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin mr-2" />
                            Loading collections...
                          </div>
                        ) : collections.length === 0 ? (
                          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            No collections available. Collections will be loaded from your Treez account.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative">
                              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Search collections..."
                                value={collectionSearch}
                                onChange={(e) => setCollectionSearch(e.target.value)}
                                className="bg-muted/30 pl-9"
                              />
                            </div>
                            
                            <div className="rounded-lg border border-border bg-card max-h-64 overflow-y-auto">
                              {filteredCollections.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                  No collections match your search
                                </div>
                              ) : (
                                <div className="divide-y divide-border">
                                  {filteredCollections.map((collection) => {
                                    const isSelected = formData.selectedCollections.some((c) => c.id === collection.id)
                                    return (
                                      <label
                                        key={collection.id}
                                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleCollection(collection)}
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{collection.name}</span>
                                            {isSelected && (
                                              <CheckIcon className="size-4 text-[#0C3D22]" />
                                            )}
                                          </div>
                                          {collection.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {collection.description}
                                            </p>
                                          )}
                                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                            ID: {collection.id}
                                          </p>
                                        </div>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                            
                            {formData.selectedCollections.length > 0 && (
                              <div className="rounded-lg border border-[#0C3D22]/20 bg-[#0C3D22]/5 p-3">
                                <p className="text-xs font-semibold text-[#0C3D22] mb-2">
                                  Selected Collections ({formData.selectedCollections.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.selectedCollections.map((collection) => (
                                    <span
                                      key={collection.id}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0C3D22] px-2.5 py-1 text-xs font-medium text-white"
                                    >
                                      {collection.name}
                                      <button
                                        type="button"
                                        onClick={() => toggleCollection(collection)}
                                        className="hover:bg-white/20 rounded-full p-0.5"
                                      >
                                        <XIcon className="size-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">Coupons</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Add coupon codes that customers can use to apply this discount
                        </p>
                        <div className="space-y-2 mb-2">
                          <Input
                            placeholder="Coupon Code *"
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                            className="bg-muted/30"
                          />
                          <Input
                            placeholder="Coupon Title (optional)"
                            value={newCouponTitle}
                            onChange={(e) => setNewCouponTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addCoupon()
                              }
                            }}
                            className="bg-muted/30"
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          className="gap-1.5 bg-[#0C3D22] text-white hover:bg-[#0C3D22]/90 border-[#0C3D22]"
                          onClick={addCoupon}
                        >
                          <PlusIcon className="size-4" />
                          Add Coupon
                        </Button>
                        {formData.coupons.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {formData.coupons.map((coupon, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                              >
                                <div>
                                  <span className="text-sm font-semibold font-mono">{coupon.code}</span>
                                  {coupon.title && coupon.title !== coupon.code && (
                                    <span className="ml-2 text-xs text-muted-foreground">({coupon.title})</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCoupon(idx)}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  <XIcon className="size-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stores Step */}
              {currentStep === "stores" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Select stores to apply the discount
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      By default, global conditions will apply unless you customize them at the store level.
                    </p>

                    {storesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2Icon className="size-6 animate-spin text-[#0C3D22]" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading stores...</span>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-lg border border-border bg-muted/20 p-4 mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3">
                            Global discount conditions
                          </h4>
                          <div className="grid grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-1">AMOUNT</p>
                              <p className="font-semibold">
                                {formData.amount ? `${formData.amount} ${formData.method === "PERCENT" ? "%" : "$"}` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">TYPE</p>
                              <p className="font-semibold">{formData.isCart ? "Cart" : "Line Item"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">PIN</p>
                              <p className="font-semibold">{formData.requirePin ? "Required" : "Not Required"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">REASON</p>
                              <p className="font-semibold">{formData.requireReason ? "Required" : "Not Required"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3">Select Stores</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Select the stores that will use this discount. Leave empty to apply to all stores.
                          </p>
                          <label className="flex items-center gap-2 mb-4 cursor-pointer">
                            <Checkbox
                              id="allStores"
                              checked={formData.selectedStores.length === stores.length && stores.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) selectAllStores()
                                else clearAllStores()
                              }}
                            />
                            <span className="text-sm font-medium">All Stores ({stores.length})</span>
                          </label>

                          <div className="space-y-2">
                            {stores.map((store) => (
                              <div
                                key={store.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                  <Checkbox
                                    checked={formData.selectedStores.some((s) => s.id === store.id)}
                                    onCheckedChange={() => toggleStore(store)}
                                  />
                                  <div>
                                    <span className="text-sm font-medium">{store.name}</span>
                                    <p className="text-xs text-muted-foreground font-mono">ID: {store.id}</p>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Conditions Step - keeping existing */}
              {currentStep === "conditions" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Set Conditions</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Apply conditions to determine when this discount becomes eligible for checkout at your organization
                      stores. Tailor its availability based on specific criteria.
                    </p>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-card p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Per-Customer Limit</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Restricts the number of times a discount can be applied per customer level
                        </p>
                        <Label htmlFor="customerLimit" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Max Count
                        </Label>
                        <Input
                          id="customerLimit"
                          type="number"
                          value={formData.perCustomerLimit}
                          onChange={(e) => updateFormData({ perCustomerLimit: e.target.value })}
                          placeholder="Leave empty for unlimited"
                          className="bg-muted/30 mt-2"
                        />
                      </div>

                      <div className="rounded-lg border border-border bg-card p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Purchase Minimum Requirement
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Purchase minimum is evaluated pre-discount. Subtotal is before tax, grand total includes tax.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="minAmount" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Min Amount
                            </Label>
                            <Input
                              id="minAmount"
                              type="number"
                              step="0.01"
                              value={formData.purchaseMinimum}
                              onChange={(e) => updateFormData({ purchaseMinimum: e.target.value })}
                              placeholder="0.00"
                              className="bg-muted/30 mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="purchaseType" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Purchase Amount Type
                            </Label>
                            <select
                              id="purchaseType"
                              value={formData.purchaseMinimumType}
                              onChange={(e) => updateFormData({ purchaseMinimumType: e.target.value as "GRANDTOTAL" | "SUBTOTAL" })}
                              className="h-9 w-full appearance-none rounded-lg border border-border bg-muted/30 px-3 text-sm mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="GRANDTOTAL">Grand Total</option>
                              <option value="SUBTOTAL">Subtotal</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Redemption Item Limit</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Number of times the discount can be applied to a single transaction
                        </p>
                        <Label htmlFor="itemLimit" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Max Count
                        </Label>
                        <Input
                          id="itemLimit"
                          type="number"
                          value={formData.itemLimit}
                          onChange={(e) => updateFormData({ itemLimit: e.target.value })}
                          placeholder="Leave empty for unlimited"
                          className="bg-muted/30 mt-2"
                        />
                      </div>

                      <div className="rounded-lg border border-border bg-card p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Fulfillment Type</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Types of orders this discount can be applied to
                        </p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={formData.fulfillmentTypes.IN_STORE}
                              onCheckedChange={(checked) =>
                                updateFormData({
                                  fulfillmentTypes: { ...formData.fulfillmentTypes, IN_STORE: checked === true },
                                })
                              }
                            />
                            <span className="text-sm">In Store</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={formData.fulfillmentTypes.DELIVERY}
                              onCheckedChange={(checked) =>
                                updateFormData({
                                  fulfillmentTypes: { ...formData.fulfillmentTypes, DELIVERY: checked === true },
                                })
                              }
                            />
                            <span className="text-sm">Delivery</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={formData.fulfillmentTypes.PICKUP}
                              onCheckedChange={(checked) =>
                                updateFormData({
                                  fulfillmentTypes: { ...formData.fulfillmentTypes, PICKUP: checked === true },
                                })
                              }
                            />
                            <span className="text-sm">Pickup</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={formData.fulfillmentTypes.EXPRESS}
                              onCheckedChange={(checked) =>
                                updateFormData({
                                  fulfillmentTypes: { ...formData.fulfillmentTypes, EXPRESS: checked === true },
                                })
                              }
                            />
                            <span className="text-sm">Express</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NEW: Schedule Step */}
              {currentStep === "schedule" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Schedule Discount</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Set when this discount is active. Leave disabled for always-active discount.
                    </p>

                    <div className="space-y-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          id="scheduleEnabled"
                          checked={formData.schedule.enabled}
                          onCheckedChange={(checked) =>
                            updateFormData({
                              schedule: { ...formData.schedule, enabled: checked === true },
                            })
                          }
                        />
                        <span className="text-sm font-medium">Enable Schedule</span>
                      </label>

                      {formData.schedule.enabled && (
                        <>
                          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                            <h4 className="text-sm font-semibold text-foreground">Date & Time</h4>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                                <Input
                                  id="startDate"
                                  type="date"
                                  value={formData.schedule.startDate}
                                  onChange={(e) =>
                                    updateFormData({
                                      schedule: { ...formData.schedule, startDate: e.target.value },
                                    })
                                  }
                                  className="bg-muted/30 mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="endDate" className="text-xs">End Date (Optional)</Label>
                                <Input
                                  id="endDate"
                                  type="date"
                                  value={formData.schedule.endDate}
                                  onChange={(e) =>
                                    updateFormData({
                                      schedule: { ...formData.schedule, endDate: e.target.value },
                                    })
                                  }
                                  className="bg-muted/30 mt-1"
                                />
                              </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                id="allDay"
                                checked={formData.schedule.allDay}
                                onCheckedChange={(checked) =>
                                  updateFormData({
                                    schedule: { ...formData.schedule, allDay: checked === true },
                                  })
                                }
                              />
                              <span className="text-sm">All Day</span>
                            </label>

                            {!formData.schedule.allDay && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="startTime" className="text-xs">Start Time</Label>
                                  <Input
                                    id="startTime"
                                    type="time"
                                    value={formData.schedule.startTime}
                                    onChange={(e) =>
                                      updateFormData({
                                        schedule: { ...formData.schedule, startTime: e.target.value },
                                      })
                                    }
                                    className="bg-muted/30 mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="endTime" className="text-xs">End Time</Label>
                                  <Input
                                    id="endTime"
                                    type="time"
                                    value={formData.schedule.endTime}
                                    onChange={(e) =>
                                      updateFormData({
                                        schedule: { ...formData.schedule, endTime: e.target.value },
                                      })
                                    }
                                    className="bg-muted/30 mt-1"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                            <h4 className="text-sm font-semibold text-foreground">Repeat</h4>
                            
                            <div>
                              <Label htmlFor="repeatType" className="text-xs">Repeat Pattern</Label>
                              <select
                                id="repeatType"
                                value={formData.schedule.repeatType}
                                onChange={(e) =>
                                  updateFormData({
                                    schedule: {
                                      ...formData.schedule,
                                      repeatType: e.target.value as any,
                                    },
                                  })
                                }
                                className="h-9 w-full appearance-none rounded-lg border border-border bg-muted/30 px-3 text-sm mt-1"
                              >
                                <option value="NEVER">Does not repeat</option>
                                <option value="DAY">Every day</option>
                                <option value="WEEK">Every week</option>
                                <option value="CUSTOM">Custom</option>
                              </select>
                            </div>

                            {formData.schedule.repeatType === "CUSTOM" && (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Repeat Every</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={formData.schedule.customRepeatIntervalCount}
                                      onChange={(e) =>
                                        updateFormData({
                                          schedule: {
                                            ...formData.schedule,
                                            customRepeatIntervalCount: e.target.value,
                                          },
                                        })
                                      }
                                      className="bg-muted/30 mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Period</Label>
                                    <select
                                      value={formData.schedule.customRepeatEvery}
                                      onChange={(e) =>
                                        updateFormData({
                                          schedule: {
                                            ...formData.schedule,
                                            customRepeatEvery: e.target.value as "DAY" | "WEEK",
                                          },
                                        })
                                      }
                                      className="h-9 w-full appearance-none rounded-lg border border-border bg-muted/30 px-3 text-sm mt-1"
                                    >
                                      <option value="DAY">Day(s)</option>
                                      <option value="WEEK">Week(s)</option>
                                    </select>
                                  </div>
                                </div>

                                {formData.schedule.customRepeatEvery === "WEEK" && (
                                  <div>
                                    <Label className="text-xs mb-2 block">Repeat On</Label>
                                    <div className="grid grid-cols-7 gap-2">
                                      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                                        <label
                                          key={day}
                                          className={`flex items-center justify-center h-10 rounded-lg border cursor-pointer transition-colors ${
                                            formData.schedule.customRepeatDaysOfWeek[day as keyof typeof formData.schedule.customRepeatDaysOfWeek]
                                              ? "bg-[#0C3D22] text-white border-[#0C3D22]"
                                              : "border-border bg-muted/30 hover:bg-muted"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={
                                              formData.schedule.customRepeatDaysOfWeek[day as keyof typeof formData.schedule.customRepeatDaysOfWeek]
                                            }
                                            onChange={(e) =>
                                              updateFormData({
                                                schedule: {
                                                  ...formData.schedule,
                                                  customRepeatDaysOfWeek: {
                                                    ...formData.schedule.customRepeatDaysOfWeek,
                                                    [day]: e.target.checked,
                                                  },
                                                },
                                              })
                                            }
                                            className="sr-only"
                                          />
                                          <span className="text-xs font-medium">{day[0]}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <Label className="text-xs">Ends</Label>
                                  <select
                                    value={formData.schedule.customEndType}
                                    onChange={(e) =>
                                      updateFormData({
                                        schedule: {
                                          ...formData.schedule,
                                          customEndType: e.target.value as any,
                                        },
                                      })
                                    }
                                    className="h-9 w-full appearance-none rounded-lg border border-border bg-muted/30 px-3 text-sm mt-1"
                                  >
                                    <option value="NEVER">Never</option>
                                    <option value="ON_DATE">On date</option>
                                    <option value="AFTER_COUNT">After</option>
                                  </select>
                                </div>

                                {formData.schedule.customEndType === "ON_DATE" && (
                                  <Input
                                    type="date"
                                    value={formData.schedule.customEndDate}
                                    onChange={(e) =>
                                      updateFormData({
                                        schedule: { ...formData.schedule, customEndDate: e.target.value },
                                      })
                                    }
                                    className="bg-muted/30"
                                  />
                                )}

                                {formData.schedule.customEndType === "AFTER_COUNT" && (
                                  <div>
                                    <Label className="text-xs">Number of occurrences</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={formData.schedule.customEndRepeatCount}
                                      onChange={(e) =>
                                        updateFormData({
                                          schedule: {
                                            ...formData.schedule,
                                            customEndRepeatCount: e.target.value,
                                          },
                                        })
                                      }
                                      className="bg-muted/30 mt-1"
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Review Step */}
              {currentStep === "review" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Review Discount</h3>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                          Basic Information
                        </h4>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Title:</dt>
                            <dd className="font-medium">{formData.title || "—"}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Amount:</dt>
                            <dd className="font-medium">
                              {formData.amount} {formData.method === "PERCENT" ? "%" : "$"}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Type:</dt>
                            <dd className="font-medium">{formData.isCart ? "Cart" : "Line Item"}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Stackable:</dt>
                            <dd className="font-medium">{formData.isStackable ? "Yes" : "No"}</dd>
                          </div>
                        </dl>
                      </div>

                      {formData.selectedCollections.length > 0 && (
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                            Product Collections ({formData.selectedCollections.length})
                          </h4>
                          <ul className="space-y-1 text-sm">
                            {formData.selectedCollections.map((collection) => (
                              <li key={collection.id} className="flex items-center gap-2">
                                <CheckIcon className="size-4 text-[#0C3D22]" />
                                <span className="font-medium">{collection.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">({collection.id})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {formData.coupons.length > 0 && (
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                            Coupons ({formData.coupons.length})
                          </h4>
                          <ul className="space-y-1 text-sm">
                            {formData.coupons.map((coupon) => (
                              <li key={coupon.code} className="flex items-center gap-2">
                                <CheckIcon className="size-4 text-[#0C3D22]" />
                                <span className="font-mono font-semibold">{coupon.code}</span>
                                {coupon.title && coupon.title !== coupon.code && (
                                  <span className="text-muted-foreground">({coupon.title})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                          Stores ({formData.selectedStores.length || "All"})
                        </h4>
                        {formData.selectedStores.length === 0 ? (
                          <p className="text-sm text-muted-foreground">All stores (no restrictions)</p>
                        ) : (
                          <ul className="grid grid-cols-2 gap-2 text-sm">
                            {formData.selectedStores.map((store) => (
                              <li key={store.id} className="flex items-center gap-2">
                                <CheckIcon className="size-4 text-[#0C3D22] shrink-0" />
                                <span className="truncate">{store.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {formData.schedule.enabled && (
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                            Schedule
                          </h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Start:</dt>
                              <dd className="font-medium">
                                {formData.schedule.startDate}
                                {!formData.schedule.allDay && formData.schedule.startTime && ` at ${formData.schedule.startTime}`}
                              </dd>
                            </div>
                            {formData.schedule.endDate && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">End:</dt>
                                <dd className="font-medium">
                                  {formData.schedule.endDate}
                                  {!formData.schedule.allDay && formData.schedule.endTime && ` at ${formData.schedule.endTime}`}
                                </dd>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Repeat:</dt>
                              <dd className="font-medium">
                                {formData.schedule.repeatType === "NEVER" && "Does not repeat"}
                                {formData.schedule.repeatType === "DAY" && "Every day"}
                                {formData.schedule.repeatType === "WEEK" && "Every week"}
                                {formData.schedule.repeatType === "CUSTOM" &&
                                  `Every ${formData.schedule.customRepeatIntervalCount} ${formData.schedule.customRepeatEvery.toLowerCase()}(s)`}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}

                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                          Conditions
                        </h4>
                        <dl className="space-y-2 text-sm">
                          {formData.perCustomerLimit ? (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Per-Customer Limit:</dt>
                              <dd className="font-medium">{formData.perCustomerLimit}</dd>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Per-Customer Limit:</dt>
                              <dd className="text-muted-foreground">Unlimited</dd>
                            </div>
                          )}
                          {formData.purchaseMinimum ? (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Purchase Minimum:</dt>
                              <dd className="font-medium">
                                ${formData.purchaseMinimum} ({formData.purchaseMinimumType})
                              </dd>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Purchase Minimum:</dt>
                              <dd className="text-muted-foreground">None</dd>
                            </div>
                          )}
                          {formData.itemLimit ? (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Item Limit:</dt>
                              <dd className="font-medium">{formData.itemLimit}</dd>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Item Limit:</dt>
                              <dd className="text-muted-foreground">Unlimited</dd>
                            </div>
                          )}
                          {Object.values(formData.fulfillmentTypes).some(Boolean) && (
                            <div>
                              <dt className="text-muted-foreground mb-1">Fulfillment Types:</dt>
                              <dd className="font-medium">
                                {Object.entries(formData.fulfillmentTypes)
                                  .filter(([, enabled]) => enabled)
                                  .map(([type]) => type.replace("_", " "))
                                  .join(", ")}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer with Next button */}
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              onClick={handleNext}
              disabled={loading || !formData.title || !formData.amount}
              className="gap-2 bg-[#0C3D22] hover:bg-[#0C3D22]/90 text-white min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Creating...
                </>
              ) : isLastStep ? (
                "Create Discount"
              ) : (
                "Next"
              )}
            </Button>
          </div>
      </div>
    </DashboardShell>
  )
}
