from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parents[1]
templates = Jinja2Templates(directory=BASE_DIR / "templates")
router = APIRouter()

ARTICLES = {
    "timing-is-a-requirement": {
        "title": "A debounce bug that looked like a test problem",
        "kicker": "Field note · timing & HIL",
        "summary": "Why fixed waits create false confidence, and how to turn debounce, reset and wake-up timing into deterministic verification.",
        "read_time": "6 min read",
        "intro": "A test can fail because the ECU is wrong. It can also fail because the test does not model time correctly. In embedded qualification, those two cases are easy to confuse — especially around debounce, wake-up, reset and recovery behaviour.",
        "sections": [
            {
                "heading": "The pattern",
                "paragraphs": [
                    "A fault is injected, the script waits a fixed number of milliseconds, then checks a signal or diagnostic state. The result is flaky: sometimes the expected reaction is present, sometimes it is not, and the first instinct is to increase the wait.",
                    "That often hides the real problem. A deterministic test needs to model the timing contract: trigger point, configured debounce, signal cycle time, communication latency and an explicit measurement tolerance."
                ],
            },
            {
                "heading": "What changed the result",
                "paragraphs": [
                    "Instead of treating time as an arbitrary delay, the test flow was structured around observable states: establish nominal behaviour, inject one controlled condition, wait for the requirement-defined reaction window, verify the expected state, recover the input and verify the reset criterion.",
                    "The useful lesson is broader than one ECU: every fixed wait in a qualification script should have a reason. If the reason cannot be traced to software behaviour, bus timing, hardware settling or a test-system limitation, it is probably technical debt."
                ],
            },
            {
                "heading": "Reusable checklist",
                "bullets": [
                    "Separate ECU debounce from test-tool and bus latency.",
                    "Define the trigger edge and the observation point explicitly.",
                    "Use a bounded tolerance rather than an unexplained oversized wait.",
                    "Verify recovery/reset criteria, not only fault detection.",
                    "Report actual versus expected timing so failures are diagnosable."
                ],
            },
        ],
    },
    "uds-fault-injection-regression": {
        "title": "From one-off fault injection to repeatable UDS regression",
        "kicker": "Field note · diagnostics automation",
        "summary": "A practical architecture for turning manual sensor faults, DTC checks and recovery steps into maintainable regression.",
        "read_time": "7 min read",
        "intro": "Diagnostic test automation becomes expensive when every sensor, failure mode and recovery path is implemented as a separate hand-built script. The fastest route to scale is usually not more test cases — it is a better test architecture.",
        "sections": [
            {
                "heading": "Where manual diagnostics breaks down",
                "paragraphs": [
                    "A typical flow includes entering a diagnostic session, applying a fault, waiting for debounce, checking a network signal, reading diagnostic state, recovering the input and confirming that the error clears. Multiply that by many sensors and fault classes and copy-paste becomes the dominant maintenance strategy.",
                    "That produces inconsistent waits, inconsistent reporting and subtle differences in recovery handling."
                ],
            },
            {
                "heading": "The scalable pattern",
                "bullets": [
                    "Keep fault definition as data: target, failure mode, expected diagnostic reaction and recovery condition.",
                    "Centralize session handling, retries and communication timing.",
                    "Use the same reporting contract everywhere: action, expected value, actual value, verdict.",
                    "Treat wake-up, sleep and reset as explicit state transitions rather than hidden helper side effects.",
                    "Read counters and diagnostic values through the authoritative ECU interface, not through a helper that only reports function success."
                ],
            },
            {
                "heading": "Why this matters commercially",
                "paragraphs": [
                    "Once the architecture is stable, adding coverage becomes cheaper. New tests become parameter additions instead of new mini-frameworks. More importantly, failures become easier to triage because every test explains what was injected, what was observed and what should have happened."
                ],
            },
        ],
    },
    "hil-not-the-default": {
        "title": "HIL is valuable. It should not be the default for everything.",
        "kicker": "Engineering note · HIL / SIL / PIL",
        "summary": "A simple way to decide which checks belong on HIL, which can move earlier, and where duplicated verification effort comes from.",
        "read_time": "5 min read",
        "intro": "HIL benches are scarce because they reproduce parts of the physical system that cheaper environments cannot. The mistake is using that scarcity for verification that could run earlier and more often elsewhere.",
        "sections": [
            {
                "heading": "Ask what the test really needs",
                "bullets": [
                    "Does the result depend on real I/O timing or electrical behaviour? Keep it close to hardware.",
                    "Is the purpose software logic, diagnostics or parameter boundaries? Consider SIL or a virtual ECU.",
                    "Does the check require target compiler or processor behaviour? PIL may be enough.",
                    "Is the same logic being reimplemented separately for SIL and HIL? Fix the architecture before adding coverage."
                ],
            },
            {
                "heading": "The design goal",
                "paragraphs": [
                    "The goal is not to eliminate HIL. It is to reserve HIL for the behaviours that justify HIL, while keeping reusable test intent, parameters and expected results portable across environments.",
                    "That increases execution frequency, reduces bench queues and lets expensive integration failures surface earlier."
                ],
            },
        ],
    },
    "aspice-evidence-by-design": {
        "title": "ASPICE evidence should be a by-product of the test flow",
        "kicker": "Engineering note · SWE.6 / SYS.4",
        "summary": "How to stop qualification reporting and traceability from becoming a second project after the testing is already done.",
        "read_time": "6 min read",
        "intro": "Teams often automate execution but leave evidence manual. The result is a fast test that still needs slow qualification work before a release or assessment.",
        "sections": [
            {
                "heading": "Design the evidence contract first",
                "paragraphs": [
                    "A useful qualification test should make the action, parameter, monitored signal, expected value and actual value explicit. That is good debugging practice and good evidence practice at the same time.",
                    "Traceability is easier to maintain when requirement identifiers, test identifiers and verdicts are part of the execution model rather than reconstructed later from screenshots and logs."
                ],
            },
            {
                "heading": "What to automate together",
                "bullets": [
                    "Requirement-to-test mapping.",
                    "Precondition and environment reporting.",
                    "Expected-versus-actual values for every decisive check.",
                    "Deterministic PASS/FAIL criteria.",
                    "Links to raw logs only where they add diagnostic value.",
                    "Version and configuration metadata needed to reproduce the run."
                ],
            },
            {
                "heading": "The practical outcome",
                "paragraphs": [
                    "When evidence is designed into execution, regression and qualification stop being separate activities. The same run that finds a defect also produces material that can support review, release and assessment conversations."
                ],
            },
        ],
    },
    "measurement-changes-system": {
        "title": "When measuring the system changes the system",
        "kicker": "Field note · HW/SW debugging",
        "summary": "A reminder that embedded failures can be introduced by the measurement setup itself — and why cross-domain debugging matters.",
        "read_time": "5 min read",
        "intro": "One of the most useful embedded debugging lessons is also one of the oldest: observation is not always passive. A measurement path can load, disturb or otherwise change the circuit you are trying to understand.",
        "sections": [
            {
                "heading": "The failure pattern",
                "paragraphs": [
                    "A regulated internal supply appeared suspicious during investigation. The measurement setup itself affected MCU behaviour, making the observed symptom look like a software or power-management failure.",
                    "The breakthrough came from treating the measurement chain as part of the system: probe impedance, reference point, loading, grounding and the ECU state during observation."
                ],
            },
            {
                "heading": "What transfers to test engineering",
                "bullets": [
                    "Do not assume the test bench is transparent.",
                    "When a failure is non-deterministic, inspect instrumentation and harness effects before rewriting software logic.",
                    "Correlate electrical observations with software state, network traffic and diagnostic data.",
                    "Change one variable at a time and keep the recovery path controlled."
                ],
            },
            {
                "heading": "Why this belongs in verification",
                "paragraphs": [
                    "System-level validation sits exactly where hardware, software, communication and tooling meet. The engineer who can move across those boundaries usually resolves integration failures faster than a workflow that treats each domain in isolation."
                ],
            },
        ],
    },
}

RESEARCH_LINKS = [
    {
        "title": "2026 State of Automotive Software Development",
        "source": "Perforce / Automotive IQ / Eclipse Foundation",
        "url": "https://www.perforce.com/resources/sca/2026-state-automotive-software-development-report/leading-concerns",
        "note": "Useful benchmark on V&V time, testing constraints and late defect pressure.",
    },
    {
        "title": "vTESTstudio",
        "source": "Vector",
        "url": "https://www.vector.com/en/product/vteststudio/",
        "note": "Reference for reusable test design, parameterization and test execution across embedded environments.",
    },
    {
        "title": "Testing, Validation & Diagnostics",
        "source": "Vector",
        "url": "https://www.vector.com/en/business-unit/testing-validation-diagnostics/",
        "note": "Current view of vehicle-network, diagnostics and validation workflows.",
    },
    {
        "title": "Continuous testing for software-defined vehicles",
        "source": "dSPACE",
        "url": "https://www.dspace.com/en/pub/home/applicationfields/ind-appl/automotive-industry/software-defined-vehicle/solutions-for-sdv-development.cfm",
        "note": "Reference for moving validation earlier and connecting virtual and physical test stages.",
    },
]


@router.get("/software-testing/resources", response_class=HTMLResponse)
async def resources_index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "software_resources.html",
        {"request": request, "articles": ARTICLES, "research_links": RESEARCH_LINKS},
    )


@router.get("/software-testing/resources/{slug}", response_class=HTMLResponse)
async def resource_article(request: Request, slug: str) -> HTMLResponse:
    article = ARTICLES.get(slug)
    if article is None:
        return templates.TemplateResponse(
            request,
            "software_resources.html",
            {"request": request, "articles": ARTICLES, "research_links": RESEARCH_LINKS},
            status_code=404,
        )
    return templates.TemplateResponse(
        request,
        "software_resource_article.html",
        {"request": request, "article": article, "slug": slug},
    )
