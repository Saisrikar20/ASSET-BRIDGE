from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AssetCategory(str, Enum):
    DEPOSIT = "DEPOSIT"
    EPF = "EPF"
    INSURANCE = "INSURANCE"
    MUTUAL_FUND = "MUTUAL_FUND"
    EQUITY_DEMAT = "EQUITY_DEMAT"
    GOVT_SAVINGS = "GOVT_SAVINGS"
    PENSION = "PENSION"

class RecordStatus(str, Enum):
    ACTIVE = "active"
    INOPERATIVE = "inoperative"
    UNCLAIMED = "unclaimed"

class SourceType(str, Enum):
    SIMULATED_AGGREGATOR = "simulated_aggregator"
    DIRECT_INSTITUTION = "direct_institution"
    USER_UPLOAD = "user_upload"

class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    PROVISIONAL = "provisional"
    UNVERIFIED = "unverified"

class NomineeStatus(str, Enum):
    VALID = "valid"
    DECEASED = "deceased"
    MINOR = "minor"
    MISSING = "missing"

class AlertSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class NomineeDetail(BaseModel):
    name: str
    relation: str
    status: NomineeStatus = NomineeStatus.VALID
    guardian: Optional[str] = None

class NormalizedAsset(BaseModel):
    id: str
    category: AssetCategory
    regulator: str
    type: str
    institution: str
    ref: str
    holderName: str
    value: float
    sip: Optional[float] = None
    recordStatus: RecordStatus
    sourceType: SourceType = SourceType.SIMULATED_AGGREGATOR
    verificationStatus: VerificationStatus = VerificationStatus.PROVISIONAL
    lastActivity: str
    nominee: Optional[NomineeDetail] = None
    kycUpdated: str
    isDuplicate: bool = False
    duplicateOf: Optional[str] = None
    confidenceScore: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)

class DuplicateCandidate(BaseModel):
    primaryId: str
    duplicateId: str
    matchReason: str
    confidence: float
    resolution: str = "flagged_not_deleted"

class AlertItem(BaseModel):
    id: str
    severity: AlertSeverity
    kind: str
    title: str
    detail: str
    holdingId: str
    regulator: str
    resolved: bool = False
    createdAt: str

class CategoryBreakdown(BaseModel):
    category: AssetCategory
    count: int
    value: float

class FinancialAnalysis(BaseModel):
    totalDiscoveredValue: float
    verifiableTotal: float
    atRiskValue: float
    totalCount: int
    uniqueCount: int
    duplicateCount: int
    nomineeMissingCount: int
    inoperativeCount: int
    unclaimedCount: int
    byCategory: List[CategoryBreakdown]
    alerts: List[AlertItem]

class IdentityMatchingResult(BaseModel):
    regulator: str
    institution: str
    matchStatus: str  # exact, partial, mismatch
    isSimulated: bool = True
    confidence: float
    details: str

class ConsolidatedReport(BaseModel):
    reportId: str
    generatedAt: str
    pan: str
    holderName: str
    summary: Dict[str, Any]
    discoveredAssets: List[NormalizedAsset]
    categories: List[CategoryBreakdown]
    potentialDuplicates: List[DuplicateCandidate]
    importantFindings: List[str]
    dataLimitations: List[str]
    suggestedNextSteps: List[str]

class PANValidationRequest(BaseModel):
    pan: str
    name: Optional[str] = None

class PANValidationResponse(BaseModel):
    valid: bool
    pan: str
    entityType: Optional[str] = None
    message: str

class PipelineProcessRequest(BaseModel):
    pan: str
    name: str
    dob: str
    state: str
    aadhaarLast4: Optional[str] = ""
    mobile: Optional[str] = ""
    regulators: Optional[List[str]] = None

