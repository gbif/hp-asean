import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { CheckCircle2, XCircle, LinkIcon, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getTaxonomicCoverage, getGeographicCoverage, TaxonomicCoverage, GeographicCoverage } from "../data/api";

interface QuestionsCardProps {
  countryCode: string;
  countryName: string;
}

interface Question {
  id: number;
  question: string;
  evaluate: (taxonomic: TaxonomicCoverage | null, geographic: GeographicCoverage | null) => boolean | null;
}

const copyCardLink = (cardId: string) => {
  const url = `${window.location.origin}${window.location.pathname}#${cardId}`;
  navigator.clipboard.writeText(url);
};

export function QuestionsCard({ countryCode, countryName }: QuestionsCardProps) {
  const [taxonomicData, setTaxonomicData] = useState<TaxonomicCoverage | null>(null);
  const [geographicData, setGeographicData] = useState<GeographicCoverage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [taxonomic, geographic] = await Promise.all([
        getTaxonomicCoverage(countryCode),
        getGeographicCoverage(countryCode)
      ]);
      setTaxonomicData(taxonomic);
      setGeographicData(geographic);
      setLoading(false);
    };
    loadData();
  }, [countryCode]);

  const questions: Question[] = [
    {
      id: 1,
      question: "Has occurrence records for 6 kingdoms or more?",
      evaluate: (taxonomic) => {
        if (!taxonomic?.taxonomicCoverage) return null;
        return taxonomic.taxonomicCoverage.distinctKingdoms >= 6;
      }
    },
    {
      id: 2,
      question: "Has occurrence records for 40 phyla or more?",
      evaluate: (taxonomic) => {
        if (!taxonomic?.taxonomicCoverage) return null;
        return taxonomic.taxonomicCoverage.distinctPhyla >= 40;
      }
    },
    {
      id: 3,
      question: "Has occurrence records for 25 classes or more?",
      evaluate: (taxonomic) => {
        if (!taxonomic?.taxonomicCoverage) return null;
        return taxonomic.taxonomicCoverage.distinctClasses >= 25;
      }
    },
    {
      id: 4,
      question: "Has 100 families per thousand kilometers squared?",
      evaluate: (taxonomic) => {
        if (!taxonomic?.taxonomicCoverage?.familiesPerThousandKm2) return null;
        return taxonomic.taxonomicCoverage.familiesPerThousandKm2 >= 100;
      }
    },
    {
      id: 5,
      question: "Has 5 classes per thousand kilometers squared?",
      evaluate: (taxonomic) => {
        if (!taxonomic?.taxonomicCoverage?.classesPerThousandKm2) return null;
        return taxonomic.taxonomicCoverage.classesPerThousandKm2 >= 5;
      }
    },
    {
      id: 6,
      question: "Has 10% of resolution 7 grid cells with 10+ species?",
      evaluate: (_taxonomic, geographic) => {
        if (!geographic?.geographicCoverage) return null;
        const { totalGridCells, gridsWithAtLeast10Species } = geographic.geographicCoverage;
        if (totalGridCells === 0) return null;
        const percentage = (gridsWithAtLeast10Species / totalGridCells) * 100;
        return percentage >= 10;
      }
    }
  ];

  const renderAnswer = (result: boolean | null) => {
    if (result === null) {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <HelpCircle className="h-5 w-5" />
          <span className="text-sm">N/A</span>
        </div>
      );
    }
    
    if (result) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Yes</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-red-600">
        <XCircle className="h-5 w-5" />
        <span className="text-sm font-semibold">No</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="mb-6" id="summary-indicator-checklist">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <CardTitle>Summary Indicator Checklist</CardTitle>
            </div>
            <button
              onClick={() => copyCardLink('summary-indicator-checklist')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading checklist...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taxonomicData && !geographicData) {
    return (
      <Card className="mb-6" id="summary-indicator-checklist">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <CardTitle>Summary Indicator Checklist</CardTitle>
            </div>
            <button
              onClick={() => copyCardLink('summary-indicator-checklist')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data available for {countryName}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6" id="summary-indicator-checklist">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Summary Indicator Checklist</CardTitle>
          </div>
          <button
            onClick={() => copyCardLink('summary-indicator-checklist')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy link to this section"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead className="text-center w-[120px]">Answer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => {
              const result = question.evaluate(taxonomicData, geographicData);
              return (
                <TableRow key={question.id}>
                  <TableCell className="font-medium">{question.question}</TableCell>
                  <TableCell className="text-center">
                    {renderAnswer(result)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
